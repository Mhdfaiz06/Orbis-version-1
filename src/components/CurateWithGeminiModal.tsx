import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Compass,
  Utensils,
  Mountain,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  MapPin,
  ChevronRight,
  Info
} from 'lucide-react';
import { UserPreferences, DayPlan, Place, District } from '../types/kerala';
import { KERALA_PLACES } from '../data/keralaPlaces';

interface CurateWithGeminiModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onApplyCuratedPlan: (newDayPlans: DayPlan[], tripTitle?: string) => void;
}

export const CurateWithGeminiModal: React.FC<CurateWithGeminiModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onApplyCuratedPlan,
}) => {
  const [userPrompt, setUserPrompt] = useState(
    'Include scenic mountain viewpoints, misty peaks, and authentic regional Kerala lunch spots & tea breaks for each day.'
  );
  const [dietaryPreference, setDietaryPreference] = useState(
    'Authentic Kerala (Seafood, Duck Roast & Traditional Sadya)'
  );
  const [focusTag, setFocusTag] = useState<'mountains' | 'food' | 'balanced' | 'family'>('balanced');
  const [isLoading, setIsLoading] = useState(false);
  const [curatedResult, setCuratedResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCurate = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let promptToUse = userPrompt;
      if (focusTag === 'mountains') {
        promptToUse += ' Prioritize high-altitude mountain peaks (Kolukkumalai, Meesapulimala, Chembra, Ilaveezhapoonchira) and tea gardens.';
      } else if (focusTag === 'food') {
        promptToUse += ' Prioritize legendary Kerala food spots (Paragon Kozhikode, Karimpumkala, Kayees Mattancherry, Rapsy Munnar) and ensure full lunch breaks.';
      } else if (focusTag === 'family') {
        promptToUse += ' Ensure senior-friendly pacing with zero strenuous climbing, easy walks, and pleasant dining stops.';
      }

      const res = await fetch('/api/curate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelers: preferences.travelers,
          style: preferences.style,
          days: preferences.days,
          startHubId: preferences.startHubId,
          categories: preferences.categories,
          userPrompt: promptToUse,
          dietaryPreference,
          availablePlaces: KERALA_PLACES,
        }),
      });

      const data = await res.json();
      if (!data.success && !data.days) {
        throw new Error(data.error || 'Failed to curate itinerary');
      }

      setCuratedResult(data);
    } catch (err: any) {
      console.error('Gemini curation error:', err);
      setErrorMessage(err.message || 'Error communicating with curation engine.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!curatedResult || !curatedResult.days) return;

    // Convert Gemini curated days into app DayPlan[]
    const placesMap = new Map<string, Place>();
    KERALA_PLACES.forEach((p) => placesMap.set(p.id, p));

    const convertedDayPlans: DayPlan[] = curatedResult.days.map((d: any, dayIdx: number) => {
      const dayNum = d.day || dayIdx + 1;
      const stops = (d.stops || []).map((s: any, stopIdx: number) => {
        // Look up place in database or build enriched place
        let matchedPlace = placesMap.get(s.placeId);
        if (!matchedPlace) {
          // fallback find by name
          matchedPlace = KERALA_PLACES.find((p) =>
            p.name.toLowerCase().includes(s.name.toLowerCase())
          );
        }

        if (!matchedPlace) {
          matchedPlace = {
            id: s.placeId || `curated_${dayNum}_${stopIdx}`,
            name: s.name,
            district: (s.district as District) || 'Idukki',
            category: [s.category || (s.isMountain ? 'Mountain' : 'Culture')],
            coordinates: [10.0889, 77.0595], // default Munnar/Central
            avg_time_spent: s.durationMinutes || 90,
            senior_friendly: true,
            kid_friendly: true,
            opening_hours: { open: '08:00', close: '18:00' },
            approx_cost: s.isFoodBreak ? 350 : 100,
            description: s.curationNote || 'Curated highlight chosen by Gemini AI for optimal day flow.',
            highlights: [s.district || 'Kerala', s.isMountain ? 'Scenic Peak' : 'Curated Spot'],
            image: s.isMountain
              ? 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800&auto=format&fit=crop&q=80',
            weatherRegion: 'Highlands',
            isMountain: s.isMountain,
            isFoodSpot: s.isFoodBreak,
            foodSpecialty: s.foodSpecialty,
          };
        }

        const startMin = 540 + stopIdx * 150; // starting around 09:00 AM
        const endMin = startMin + (s.durationMinutes || 90);

        return {
          id: `stop_${dayNum}_${stopIdx}_${Date.now()}`,
          placeId: matchedPlace.id,
          place: matchedPlace,
          day: dayNum,
          scheduledStartTime: `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`,
          scheduledEndTime: `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`,
          allocatedDuration: s.durationMinutes || 90,
          travelTimeToNextMinutes: 45,
          travelDistanceToNextKm: 25,
          conflicts: [],
          isFoodBreak: s.isFoodBreak,
          curationReason: s.curationNote,
        };
      });

      return {
        day: dayNum,
        title: d.title || `Day ${dayNum}: Kerala Exploration`,
        theme: d.theme || 'Scenic & Cultural Discoveries',
        stops,
        totalDriveMinutes: 90,
        totalDistanceKm: 60,
        districtsVisited: [d.district || 'Idukki'] as District[],
        hotelSuggestion: {
          name: `${d.district || 'Kerala'} Scenic Heritage Stay`,
          area: `${d.district || 'Kerala'} Valley`,
          pricePerNight: 4200,
          rating: 4.8,
        },
        lunchSpotSuggestion: d.lunchSpot ? {
          name: d.lunchSpot.name,
          specialty: d.lunchSpot.specialty,
          district: d.district || 'Kerala',
          estimatedMinutes: d.lunchSpot.estimatedMinutes || 60,
          recommendation: d.lunchSpot.recommendation,
        } : undefined,
        curatedSummary: d.theme,
        proTips: d.proTips || [],
      };
    });

    onApplyCuratedPlan(convertedDayPlans, curatedResult.tripTitle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white px-6 py-5 flex items-center justify-between border-b border-emerald-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-serif text-white">
                  Gemini AI Itinerary Curation
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Intelligently curates finite places, authentic midday lunch spots, and mountain viewpoints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-300 hover:text-white hover:bg-emerald-800/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick Focus Tags */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              Trip Curation Focus
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'balanced', label: 'Balanced Panorama', icon: Compass },
                { id: 'mountains', label: 'High Peaks & Mist', icon: Mountain },
                { id: 'food', label: 'Kerala Food Trail', icon: Utensils },
                { id: 'family', label: 'Gentle Senior Pacing', icon: Users },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = focusTag === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFocusTag(item.id as any)}
                    className={`flex items-center gap-2 p-3 rounded-2xl text-xs font-semibold border transition text-left ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-stone-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Instructions */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              Special Preferences & Specific Requests
            </label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={2}
              placeholder="e.g. Include Kolukkumalai sunrise, authentic Kozhikode biryani lunch, and evening tea estates..."
              className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Dietary & Dining */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
                Midday Dining & Lunch Preference
              </label>
              <select
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Authentic Kerala (Seafood, Duck Roast & Traditional Sadya)">
                  Traditional Kerala (Seafood, Duck Roast & Sadya)
                </option>
                <option value="Vegetarian Sadya & South Indian Meals">
                  Pure Vegetarian Sadya & Banana Leaf Feasts
                </option>
                <option value="Malabar Biryani & Halal Delicacies">
                  North Malabar Dum Biryani & Parotta Specialties
                </option>
                <option value="Highland Tea Rooms, Cafes & Light Bakes">
                  Highland Tea Rooms, Cafes & Light Sandwiches
                </option>
              </select>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
                <Utensils className="w-3.5 h-3.5 text-emerald-700" />
                <span>Automatic Lunch Breaks</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Gemini will automatically allocate an authentic regional lunch spot between 12:30 PM and 2:00 PM for each day.
              </p>
            </div>
          </div>

          {/* Curate Action Button */}
          <div className="flex justify-center pt-1">
            <button
              onClick={handleCurate}
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Curating with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>Curate {preferences.days}-Day Itinerary</span>
                </>
              )}
            </button>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Curated Results Preview */}
          {curatedResult && curatedResult.days && (
            <div className="space-y-4 pt-2 border-t border-stone-200">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-bold font-serif text-sm sm:text-base text-emerald-950">
                    {curatedResult.tripTitle || 'Curated Itinerary Preview'}
                  </h4>
                  {curatedResult.aiPowered && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                      AI Generated
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed mb-2">
                  {curatedResult.summary || curatedResult.rationale}
                </p>
              </div>

              {/* Day Cards */}
              <div className="space-y-3">
                {curatedResult.days.map((day: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-stone-200/80 pb-2">
                      <div>
                        <div className="text-xs font-bold text-stone-900">
                          {day.title || `Day ${day.day || idx + 1}`}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          District: {day.district || 'Kerala'} · {day.theme}
                        </div>
                      </div>
                      {day.lunchSpot && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                          <Utensils className="w-3 h-3 text-amber-600" />
                          <span>Lunch: {day.lunchSpot.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Stops List */}
                    <div className="space-y-1.5">
                      {(day.stops || []).map((stop: any, sIdx: number) => (
                        <div
                          key={sIdx}
                          className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-stone-200/70"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {sIdx + 1}
                            </span>
                            <div>
                              <span className="font-semibold text-stone-900">{stop.name}</span>
                              {stop.isMountain && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                                  ⛰️ Peak
                                </span>
                              )}
                              {stop.isFoodBreak && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                  🍲 Food Stop
                                </span>
                              )}
                              {stop.curationNote && (
                                <p className="text-[10px] text-stone-500 mt-0.5">
                                  {stop.curationNote}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-stone-400 shrink-0 font-mono">
                            {stop.durationMinutes || 90}m
                          </span>
                        </div>
                      ))}
                    </div>

                    {day.lunchSpot && day.lunchSpot.specialty && (
                      <div className="text-[11px] bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl text-amber-900">
                        <span className="font-bold">🍽️ Regional Specialty: </span>
                        <span>{day.lunchSpot.specialty}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Apply Button */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-md flex items-center gap-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Apply This Curated Itinerary</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
