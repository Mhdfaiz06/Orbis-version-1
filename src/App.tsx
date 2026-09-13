/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  UserPreferences,
  DayPlan,
  ItineraryStop,
  Place,
} from './types/kerala';
import { KERALA_PLACES } from './data/keralaPlaces';
import {
  generateKeralaItinerary,
  recalculateDayStops,
  calculateGameMetrics,
} from './utils/itineraryEngine';
import { fetchOSRMRoute } from './services/osrmRouting';
import { Navbar } from './components/Navbar';
import { InteractiveMap } from './components/InteractiveMap';
import { ItinerarySidebar } from './components/ItinerarySidebar';
import { DirectInputBar } from './components/DirectInputBar';
import { TravelWizardModal } from './components/TravelWizardModal';
import { TimelineModal } from './components/TimelineModal';
import { GameStatsModal } from './components/GameStatsModal';
import { WeatherModal } from './components/WeatherModal';
import { PrintSummaryModal } from './components/PrintSummaryModal';
import { AddStopModal } from './components/AddStopModal';
import { PlaceDetailsModal } from './components/PlaceDetailsModal';
import { CurateWithGeminiModal } from './components/CurateWithGeminiModal';
import { AlertTriangle, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import { formatDuration } from './utils/geoRouting';

const INITIAL_PREFERENCES: UserPreferences = {
  travelers: [
    { id: 'trav_1', name: 'Faiz', age: 29 },
    { id: 'trav_2', name: 'Amina', age: 27 },
    { id: 'trav_3', name: 'Grandmother Leela', age: 65 },
  ],
  style: 'normal',
  days: 4,
  startHubId: 'hub_cochin_airport',
  categories: ['Mountain', 'Backwaters', 'Beach', 'Historic', 'Culinary'],
  mustVisitPlaceIds: ['place_eravikulam', 'place_alleppey_houseboat'],
  budgetLevel: 'standard',
};

export default function App() {
  const [preferences, setPreferences] = useState<UserPreferences>(INITIAL_PREFERENCES);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>(() =>
    generateKeralaItinerary(INITIAL_PREFERENCES, KERALA_PLACES)
  );

  const [selectedDay, setSelectedDay] = useState<number>(1); // 0 for All, or 1, 2, ...
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [gameStatsOpen, setGameStatsOpen] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [timelineDay, setTimelineDay] = useState<number | null>(null);
  const [addStopTargetDay, setAddStopTargetDay] = useState<number | null>(null);
  const [inspectedPlace, setInspectedPlace] = useState<Place | null>(null);
  const [curateModalOpen, setCurateModalOpen] = useState(false);

  // Show temporary toast notification
  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Recalculate game metrics dynamically
  const gameMetrics = useMemo(
    () => calculateGameMetrics(dayPlans, preferences),
    [dayPlans, preferences]
  );

  // Asynchronously refine stops using real OSRM road API
  const refineStopsWithOSRM = useCallback(
    async (dayNumber: number, currentStops: ItineraryStop[]) => {
      if (currentStops.length < 2) return;

      let hasOSRMUpdates = false;
      const updatedStops = [...currentStops];

      for (let i = 0; i < updatedStops.length - 1; i++) {
        const stopA = updatedStops[i];
        const stopB = updatedStops[i + 1];

        try {
          const osrm = await fetchOSRMRoute(
            stopA.place.coordinates,
            stopB.place.coordinates,
            stopA.place.district,
            stopB.place.district
          );

          if (
            osrm.isRealRoad &&
            (stopA.travelTimeToNextMinutes !== osrm.durationMinutes ||
              stopA.travelDistanceToNextKm !== osrm.distanceKm)
          ) {
            updatedStops[i] = {
              ...stopA,
              travelTimeToNextMinutes: osrm.durationMinutes,
              travelDistanceToNextKm: osrm.distanceKm,
            };
            hasOSRMUpdates = true;
          }
        } catch (e) {
          // keep fallback
        }
      }

      if (hasOSRMUpdates) {
        setDayPlans((prev) =>
          prev.map((dp) => {
            if (dp.day !== dayNumber) return dp;
            const newDriveTime = updatedStops.reduce(
              (sum, s) => sum + s.travelTimeToNextMinutes,
              0
            );
            const newDistance = updatedStops.reduce(
              (sum, s) => sum + s.travelDistanceToNextKm,
              0
            );
            return {
              ...dp,
              stops: updatedStops,
              totalDriveMinutes: newDriveTime,
              totalDistanceKm: Math.round(newDistance * 10) / 10,
            };
          })
        );
      }
    },
    []
  );

  // 1. Reorder a stop within a day (Drag & Drop or Move Up/Down)
  const handleReorderStop = useCallback(
    (day: number, fromIndex: number, toIndex: number) => {
      setDayPlans((prev) => {
        return prev.map((dp) => {
          if (dp.day !== day) return dp;

          const oldDriveTime = dp.totalDriveMinutes;
          const reorderedStops = [...dp.stops];
          const [movedStop] = reorderedStops.splice(fromIndex, 1);
          reorderedStops.splice(toIndex, 0, movedStop);

          const computed = recalculateDayStops(
            reorderedStops,
            day,
            preferences.style,
            preferences.travelers
          );

          const newDriveTime = computed.reduce(
            (sum, s) => sum + s.travelTimeToNextMinutes,
            0
          );
          const newDistance = computed.reduce(
            (sum, s) => sum + s.travelDistanceToNextKm,
            0
          );

          // Conflict checker notification
          const driveDiff = newDriveTime - oldDriveTime;
          if (driveDiff > 45) {
            triggerToast(
              `⚠️ Reordering increased Day ${day} travel time by ${formatDuration(driveDiff)}!`
            );
          } else if (driveDiff < -20) {
            triggerToast(
              `🎉 Great route! Saved ${formatDuration(Math.abs(driveDiff))} in travel time!`
            );
          }

          // Trigger background OSRM highway refinement
          refineStopsWithOSRM(day, computed);

          return {
            ...dp,
            stops: computed,
            totalDriveMinutes: newDriveTime,
            totalDistanceKm: Math.round(newDistance * 10) / 10,
          };
        });
      });
    },
    [preferences.style, preferences.travelers, triggerToast, refineStopsWithOSRM]
  );

  // 2. Remove stop
  const handleRemoveStop = useCallback(
    (day: number, stopId: string) => {
      setDayPlans((prev) => {
        return prev.map((dp) => {
          if (dp.day !== day) return dp;
          const remaining = dp.stops.filter((s) => s.id !== stopId);
          const computed = recalculateDayStops(
            remaining,
            day,
            preferences.style,
            preferences.travelers
          );
          const newDriveTime = computed.reduce(
            (sum, s) => sum + s.travelTimeToNextMinutes,
            0
          );
          const newDistance = computed.reduce(
            (sum, s) => sum + s.travelDistanceToNextKm,
            0
          );

          refineStopsWithOSRM(day, computed);

          return {
            ...dp,
            stops: computed,
            totalDriveMinutes: newDriveTime,
            totalDistanceKm: Math.round(newDistance * 10) / 10,
          };
        });
      });
      triggerToast('Removed attraction from day plan.');
    },
    [preferences.style, preferences.travelers, triggerToast, refineStopsWithOSRM]
  );

  // 3. Update stop allocated duration (Duration Slider)
  const handleUpdateStopDuration = useCallback(
    (day: number, stopId: string, durationMinutes: number) => {
      setDayPlans((prev) => {
        return prev.map((dp) => {
          if (dp.day !== day) return dp;
          const updated = dp.stops.map((s) =>
            s.id === stopId ? { ...s, allocatedDuration: durationMinutes } : s
          );
          const computed = recalculateDayStops(
            updated,
            day,
            preferences.style,
            preferences.travelers
          );

          return {
            ...dp,
            stops: computed,
          };
        });
      });
    },
    [preferences.style, preferences.travelers]
  );

  // 4. Add place to a day
  const handleAddPlaceToDay = useCallback(
    (place: Place, targetDay: number) => {
      setDayPlans((prev) => {
        return prev.map((dp) => {
          if (dp.day !== targetDay) return dp;

          // Check if already in day
          if (dp.stops.some((s) => s.place.id === place.id)) {
            triggerToast(`${place.name} is already in Day ${targetDay}`);
            return dp;
          }

          const newStop: ItineraryStop = {
            id: `stop_${targetDay}_${Date.now()}_${place.id}`,
            placeId: place.id,
            place,
            day: targetDay,
            scheduledStartTime: '12:00',
            scheduledEndTime: '14:00',
            allocatedDuration: place.avg_time_spent || 90,
            travelTimeToNextMinutes: 0,
            travelDistanceToNextKm: 0,
            conflicts: [],
          };

          const newStops = [...dp.stops, newStop];
          const computed = recalculateDayStops(
            newStops,
            targetDay,
            preferences.style,
            preferences.travelers
          );

          const newDriveTime = computed.reduce(
            (sum, s) => sum + s.travelTimeToNextMinutes,
            0
          );
          const newDistance = computed.reduce(
            (sum, s) => sum + s.travelDistanceToNextKm,
            0
          );

          refineStopsWithOSRM(targetDay, computed);

          return {
            ...dp,
            stops: computed,
            totalDriveMinutes: newDriveTime,
            totalDistanceKm: Math.round(newDistance * 10) / 10,
          };
        });
      });

      setSelectedDay(targetDay);
      triggerToast(`Added ${place.name} to Day ${targetDay}`);
    },
    [preferences.style, preferences.travelers, triggerToast, refineStopsWithOSRM]
  );

  // 5. Add custom pinned discovery
  const handleAddCustomPin = useCallback(
    (name: string, coordinates: [number, number], targetDay: number) => {
      const customPlace: Place = {
        id: `custom_${Date.now()}`,
        name,
        district: 'Ernakulam',
        category: ['Culture'],
        coordinates,
        avg_time_spent: 90,
        senior_friendly: true,
        kid_friendly: true,
        opening_hours: { open: '08:00', close: '20:00' },
        approx_cost: 0,
        description: 'Custom pinned discovery added directly from the Kerala interactive map.',
        highlights: ['Custom gem', 'Off-beat discovery'],
        image:
          'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800&auto=format&fit=crop&q=80',
        weatherRegion: 'Central Plains',
        isCustom: true,
      };

      handleAddPlaceToDay(customPlace, targetDay);
    },
    [handleAddPlaceToDay]
  );

  // 6. Apply updated preferences from Wizard
  const handleSavePreferences = useCallback(
    (updated: UserPreferences) => {
      setPreferences(updated);
      const newPlans = generateKeralaItinerary(updated, KERALA_PLACES);
      setDayPlans(newPlans);
      setSelectedDay(1);
      triggerToast('New Kerala discovery route generated successfully!');

      // Warm OSRM for all days
      newPlans.forEach((dp) => {
        refineStopsWithOSRM(dp.day, dp.stops);
      });
    },
    [triggerToast, refineStopsWithOSRM]
  );

  // 7. Reset to default
  const handleReset = useCallback(() => {
    setPreferences(INITIAL_PREFERENCES);
    const defPlans = generateKeralaItinerary(INITIAL_PREFERENCES, KERALA_PLACES);
    setDayPlans(defPlans);
    setSelectedDay(1);
    triggerToast('Reset itinerary to default classic Kerala route.');

    defPlans.forEach((dp) => {
      refineStopsWithOSRM(dp.day, dp.stops);
    });
  }, [triggerToast, refineStopsWithOSRM]);

  // 8. Apply Gemini Curated Itinerary
  const handleApplyCuratedPlan = useCallback(
    (newDayPlans: DayPlan[], tripTitle?: string) => {
      setDayPlans(newDayPlans);
      setSelectedDay(1);
      triggerToast(
        `✨ Applied Gemini AI Curated Plan: ${tripTitle || 'Kerala Custom Expedition'}!`
      );
      // Asynchronously refine road driving times using OSRM
      newDayPlans.forEach((dp) => {
        refineStopsWithOSRM(dp.day, dp.stops);
      });
    },
    [triggerToast, refineStopsWithOSRM]
  );

  const activeDayObject = dayPlans.find((d) => d.day === timelineDay) || dayPlans[0];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stone-100 font-sans text-stone-900">
      {/* Top Navbar */}
      <Navbar
        tripTitle={`${preferences.days}-Day Kerala Expedition (${preferences.travelers.length} travelers)`}
        totalKm={gameMetrics.totalKm}
        totalStops={gameMetrics.totalStops}
        estimatedTotalCost={gameMetrics.costBreakdown.total}
        unlockedBadgesCount={gameMetrics.badges.filter((b) => b.unlocked).length}
        totalBadgesCount={gameMetrics.badges.length}
        explorationScore={gameMetrics.explorationScore}
        onOpenWizard={() => setWizardOpen(true)}
        onOpenCurate={() => setCurateModalOpen(true)}
        onOpenBadges={() => setGameStatsOpen(true)}
        onOpenWeather={() => setWeatherOpen(true)}
        onOpenPrint={() => setPrintOpen(true)}
        onResetItinerary={handleReset}
      />

      {/* Main Workspace Area (Sidebar + Map) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        {/* Left Itinerary Sidebar */}
        <ItinerarySidebar
          dayPlans={dayPlans}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onReorderStop={handleReorderStop}
          onRemoveStop={handleRemoveStop}
          onUpdateStopDuration={handleUpdateStopDuration}
          onOpenAddStopModal={(day) => setAddStopTargetDay(day)}
          onOpenTimelineView={(day) => setTimelineDay(day)}
          onInspectPlace={setInspectedPlace}
          onOpenCurate={() => setCurateModalOpen(true)}
        />

        {/* Right Map View Area */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Floating Direct Input Bar across Top of Map */}
          <div className="absolute top-4 left-4 right-4 z-20 pointer-events-auto">
            <DirectInputBar
              selectedDay={selectedDay}
              onAddPlaceToDay={handleAddPlaceToDay}
              onInspectPlace={setInspectedPlace}
              onOpenCustomPinPrompt={(customName) => {
                triggerToast(
                  `Click anywhere on the map to place "${customName}". Drop pin mode active.`
                );
              }}
            />
          </div>

          {/* Interactive Vector/OSM Map with OSRM Road Geometry */}
          <InteractiveMap
            dayPlans={dayPlans}
            selectedDay={selectedDay}
            onSelectPlace={(place) => {
              const target = selectedDay === 0 ? 1 : selectedDay;
              handleAddPlaceToDay(place, target);
            }}
            onAddPlaceToDay={handleAddPlaceToDay}
            onAddCustomPin={handleAddCustomPin}
            onInspectPlace={setInspectedPlace}
          />
        </div>
      </div>

      {/* Dynamic Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-stone-700 text-xs flex items-center gap-2.5 animate-bounce-short">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold leading-snug">{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <TravelWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        preferences={preferences}
        onSavePreferences={handleSavePreferences}
      />

      {timelineDay !== null && activeDayObject && (
        <TimelineModal
          isOpen={timelineDay !== null}
          onClose={() => setTimelineDay(null)}
          dayPlan={activeDayObject}
          onUpdateStopDuration={handleUpdateStopDuration}
        />
      )}

      <GameStatsModal
        isOpen={gameStatsOpen}
        onClose={() => setGameStatsOpen(false)}
        totalKm={gameMetrics.totalKm}
        totalDriveHours={gameMetrics.totalDriveHours}
        totalStops={gameMetrics.totalStops}
        costBreakdown={gameMetrics.costBreakdown}
        badges={gameMetrics.badges}
        explorationScore={gameMetrics.explorationScore}
        preferences={preferences}
      />

      <WeatherModal
        isOpen={weatherOpen}
        onClose={() => setWeatherOpen(false)}
      />

      <PrintSummaryModal
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
        dayPlans={dayPlans}
        preferences={preferences}
        totalKm={gameMetrics.totalKm}
        estimatedCost={gameMetrics.costBreakdown.total}
      />

      {addStopTargetDay !== null && (
        <AddStopModal
          isOpen={addStopTargetDay !== null}
          onClose={() => setAddStopTargetDay(null)}
          targetDay={addStopTargetDay}
          existingPlaceIds={
            dayPlans
              .find((d) => d.day === addStopTargetDay)
              ?.stops.map((s) => s.place.id) || []
          }
          onAddPlace={handleAddPlaceToDay}
          onInspectPlace={setInspectedPlace}
        />
      )}

      {/* Place Dossier Modal (OpenStreetMap & Wikipedia) */}
      <PlaceDetailsModal
        isOpen={inspectedPlace !== null}
        onClose={() => setInspectedPlace(null)}
        place={inspectedPlace}
        targetDay={selectedDay === 0 ? 1 : selectedDay}
        onAddPlaceToDay={handleAddPlaceToDay}
        isAlreadyAdded={
          inspectedPlace
            ? dayPlans.some((d) => d.stops.some((s) => s.place.id === inspectedPlace.id))
            : false
        }
      />

      {/* Gemini AI Itinerary Curator Modal */}
      <CurateWithGeminiModal
        isOpen={curateModalOpen}
        onClose={() => setCurateModalOpen(false)}
        preferences={preferences}
        onApplyCuratedPlan={handleApplyCuratedPlan}
      />
    </div>
  );
}
