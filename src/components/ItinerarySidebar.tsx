import React, { useState } from 'react';
import {
  DayPlan,
  ItineraryStop,
  Place,
  ConflictAlert,
} from '../types/kerala';
import { DAY_COLORS } from './InteractiveMap';
import {
  Calendar,
  Clock,
  Car,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Plus,
  Hotel,
  Sliders,
  Sparkles,
  Info,
  MapPin,
  Utensils,
  Mountain,
} from 'lucide-react';
import { formatDuration } from '../utils/geoRouting';

interface ItinerarySidebarProps {
  dayPlans: DayPlan[];
  selectedDay: number; // 0 for All, or 1, 2, ...
  onSelectDay: (day: number) => void;
  onReorderStop: (day: number, fromIndex: number, toIndex: number) => void;
  onRemoveStop: (day: number, stopId: string) => void;
  onUpdateStopDuration: (day: number, stopId: string, durationMinutes: number) => void;
  onOpenAddStopModal: (day: number) => void;
  onOpenTimelineView: (day: number) => void;
  onInspectPlace?: (place: Place) => void;
  onOpenCurate?: () => void;
}

export const ItinerarySidebar: React.FC<ItinerarySidebarProps> = ({
  dayPlans,
  selectedDay,
  onSelectDay,
  onReorderStop,
  onRemoveStop,
  onUpdateStopDuration,
  onOpenAddStopModal,
  onOpenTimelineView,
  onInspectPlace,
  onOpenCurate,
}) => {
  // Drag and drop state
  const [draggedStopIndex, setDraggedStopIndex] = useState<number | null>(null);

  // Active day plan
  const activeDayPlan =
    selectedDay === 0
      ? null
      : dayPlans.find((d) => d.day === selectedDay) || dayPlans[0];

  return (
    <div className="w-full md:w-[420px] lg:w-[460px] bg-white border-r border-stone-200 flex flex-col h-full shadow-md z-10 shrink-0">
      {/* Day Tabs Bar */}
      <div className="p-3 border-b border-stone-200 bg-stone-50/90 backdrop-blur-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => onSelectDay(0)}
            id="tab-day-all"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedDay === 0
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
            }`}
          >
            All Days ({dayPlans.reduce((s, d) => s + d.stops.length, 0)})
          </button>

          {dayPlans.map((dp) => {
            const isSelected = selectedDay === dp.day;
            const dayColor = DAY_COLORS[(dp.day - 1) % DAY_COLORS.length];
            return (
              <button
                key={dp.day}
                id={`tab-day-${dp.day}`}
                onClick={() => onSelectDay(dp.day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'text-white shadow-sm ring-1 ring-black/10'
                    : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                }`}
                style={{
                  backgroundColor: isSelected ? dayColor : undefined,
                }}
              >
                <span>Day {dp.day}</span>
                <span
                  className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {dp.stops.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Day Header Info */}
        {activeDayPlan ? (
          <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-stone-900 truncate font-serif">
                {activeDayPlan.title}
              </h3>
              <p className="text-[11px] text-emerald-700 font-medium truncate">
                {activeDayPlan.theme}
              </p>
            </div>
            <div className="flex items-center gap-2 text-right shrink-0">
              <div className="text-[11px] text-stone-500">
                <span className="font-bold text-stone-800">
                  {activeDayPlan.totalDistanceKm} km
                </span>{' '}
                · 🚗 {formatDuration(activeDayPlan.totalDriveMinutes)}
              </div>
              <button
                onClick={() => onOpenTimelineView(activeDayPlan.day)}
                title="View Day Timeline & Slider"
                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
            <span>Full Trip Overview: {dayPlans.length} Days</span>
            <span className="font-bold text-stone-900">
              {dayPlans.reduce((s, d) => s + d.totalDistanceKm, 0)} km total
            </span>
          </div>
        )}
      </div>

      {/* Stops List Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedDay === 0 ? (
          // ALL DAYS ACCORDION VIEW
          <div className="space-y-6">
            {dayPlans.map((dp) => (
              <div
                key={dp.day}
                className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 shadow-xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: DAY_COLORS[(dp.day - 1) % DAY_COLORS.length],
                      }}
                    />
                    <h4 className="text-xs font-bold text-stone-900">
                      Day {dp.day}: {dp.districtsVisited.join(' & ')}
                    </h4>
                  </div>
                  <button
                    onClick={() => onSelectDay(dp.day)}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    Manage Day →
                  </button>
                </div>

                <div className="space-y-2">
                  {dp.stops.map((stop, idx) => (
                    <div
                      key={stop.id}
                      className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center gap-2.5 text-xs shadow-2xs"
                    >
                      <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <img
                        src={stop.place.image}
                        alt={stop.place.name}
                        className="w-9 h-9 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-stone-900 truncate">
                          {stop.place.name}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {stop.scheduledStartTime} - {stop.scheduledEndTime} (
                          {formatDuration(stop.allocatedDuration)})
                        </div>
                      </div>
                      {stop.conflicts.some((c) => c.severity === 'danger') && (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // ACTIVE SINGLE DAY STOPS (Interactive Drag/Drop & Duration Sliders)
          <div className="space-y-3">
            {activeDayPlan && activeDayPlan.stops.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-stone-200 rounded-2xl">
                <p className="text-xs text-stone-500 mb-3">
                  No stops assigned to Day {activeDayPlan.day} yet.
                </p>
                <button
                  onClick={() => onOpenAddStopModal(activeDayPlan.day)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition"
                >
                  + Add Kerala Discoveries
                </button>
              </div>
            ) : (
              activeDayPlan?.stops.map((stop, index) => {
                const isFirst = index === 0;
                const isLast = index === activeDayPlan.stops.length - 1;
                const dangerConflicts = stop.conflicts.filter((c) => c.severity === 'danger');
                const warningConflicts = stop.conflicts.filter((c) => c.severity === 'warning');

                return (
                  <div key={stop.id} className="space-y-2">
                    {/* Stop Card */}
                    <div
                      draggable
                      onDragStart={() => setDraggedStopIndex(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedStopIndex !== null && draggedStopIndex !== index) {
                          onReorderStop(activeDayPlan.day, draggedStopIndex, index);
                          setDraggedStopIndex(null);
                        }
                      }}
                      className={`bg-white rounded-2xl p-3.5 border transition shadow-xs ${
                        dangerConflicts.length > 0
                          ? 'border-red-400 bg-red-50/20'
                          : warningConflicts.length > 0
                          ? 'border-amber-300'
                          : 'border-stone-200 hover:border-emerald-400'
                      }`}
                    >
                      {/* Top Bar with Number, Name, Reorder Buttons & Delete */}
                      <div className="flex items-start gap-3">
                        {/* Drag Handle & Order Badge */}
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 cursor-grab active:cursor-grabbing"
                          style={{
                            backgroundColor:
                              DAY_COLORS[(activeDayPlan.day - 1) % DAY_COLORS.length],
                          }}
                          title="Drag to reorder stop"
                        >
                          {index + 1}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-stone-900 truncate">
                              {stop.place.name}
                            </h4>
                            {/* Reorder, Info, and Delete controls */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              {onInspectPlace && (
                                <button
                                  onClick={() => onInspectPlace(stop.place)}
                                  title="View OpenStreetMap & Wikipedia Info"
                                  className="p-1 rounded text-stone-400 hover:text-sky-700 hover:bg-sky-50 transition"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                disabled={isFirst}
                                onClick={() =>
                                  onReorderStop(activeDayPlan.day, index, index - 1)
                                }
                                title="Move Earlier"
                                className="p-1 rounded text-stone-400 hover:text-stone-700 disabled:opacity-20 disabled:hover:text-stone-400"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                disabled={isLast}
                                onClick={() =>
                                  onReorderStop(activeDayPlan.day, index, index + 1)
                                }
                                title="Move Later"
                                className="p-1 rounded text-stone-400 hover:text-stone-700 disabled:opacity-20 disabled:hover:text-stone-400"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onRemoveStop(activeDayPlan.day, stop.id)}
                                title="Remove Stop"
                                className="p-1 rounded text-stone-400 hover:text-red-600 transition ml-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-stone-500 mt-0.5">
                            <span>📍 {stop.place.district}</span>
                            <span>·</span>
                            <span className="text-emerald-700 font-semibold">
                              {stop.place.category[0]}
                            </span>
                            {stop.isFoodBreak && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 font-bold">
                                <Utensils className="w-2.5 h-2.5" /> Lunch Break
                              </span>
                            )}
                            {stop.place.isMountain && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-sky-100 text-sky-900 font-bold">
                                <Mountain className="w-2.5 h-2.5" /> Peak / Hill
                              </span>
                            )}
                          </div>

                          {stop.curationReason && (
                            <div className="mt-1 px-2 py-1 rounded-md bg-emerald-50 text-[10px] text-emerald-800 font-medium border border-emerald-200/60">
                              ✨ <span className="font-semibold">Curator note:</span> {stop.curationReason}
                            </div>
                          )}

                          {/* Time & Duration row */}
                          <div className="mt-2 flex items-center justify-between bg-stone-50 p-2 rounded-xl border border-stone-200/70 text-xs">
                            <div className="flex items-center gap-1.5 text-stone-700 font-semibold">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                {stop.scheduledStartTime} – {stop.scheduledEndTime}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              {formatDuration(stop.allocatedDuration)}
                            </span>
                          </div>

                          {/* Duration Slider (Prompt Phase 3) */}
                          <div className="mt-2.5 pt-2 border-t border-stone-100">
                            <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
                              <span className="font-semibold text-stone-600">
                                Adjust Visit Time:
                              </span>
                              <span>{formatDuration(stop.allocatedDuration)}</span>
                            </div>
                            <input
                              type="range"
                              min={30}
                              max={300}
                              step={15}
                              value={stop.allocatedDuration}
                              onChange={(e) =>
                                onUpdateStopDuration(
                                  activeDayPlan.day,
                                  stop.id,
                                  Number(e.target.value)
                                )
                              }
                              className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                          </div>

                          {/* CONFLICT WARNINGS (Prompt Phase 4) */}
                          {stop.conflicts.map((conflict, cIdx) => (
                            <div
                              key={cIdx}
                              className={`mt-2 p-2 rounded-lg text-[11px] flex items-start gap-1.5 leading-snug font-medium ${
                                conflict.severity === 'danger'
                                  ? 'bg-red-50 text-red-900 border border-red-200'
                                  : 'bg-amber-50 text-amber-900 border border-amber-200'
                              }`}
                            >
                              {conflict.severity === 'danger' ? (
                                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              )}
                              <span>{conflict.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Drive transition to next stop */}
                    {!isLast && (
                      <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-stone-600 font-medium">
                        <div className="w-0.5 h-6 bg-emerald-400/80 ml-3.5 my-0.5" />
                        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full border border-stone-200 shadow-2xs">
                          <Car className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            Predicted Road Drive: <strong className="text-stone-900">{formatDuration(stop.travelTimeToNextMinutes)}</strong> ({stop.travelDistanceToNextKm} km)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Midday Lunch Recommendation (from Gemini Curation) */}
            {activeDayPlan?.lunchSpotSuggestion && (
              <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                    <Utensils className="w-3.5 h-3.5 text-amber-700" />
                    <span>Midday Lunch Break Spot</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full">
                    {activeDayPlan.lunchSpotSuggestion.estimatedMinutes}m break
                  </span>
                </div>
                <div className="text-xs font-bold text-stone-900">
                  {activeDayPlan.lunchSpotSuggestion.name}
                </div>
                <div className="text-[11px] text-amber-900 mt-0.5">
                  🍽️ <span className="font-semibold">{activeDayPlan.lunchSpotSuggestion.specialty}</span>
                </div>
                {activeDayPlan.lunchSpotSuggestion.recommendation && (
                  <p className="text-[10px] text-stone-600 mt-1 italic leading-relaxed">
                    "{activeDayPlan.lunchSpotSuggestion.recommendation}"
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons: Add Stop & Curate with Gemini */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => onOpenAddStopModal(activeDayPlan.day)}
                id="sidebar-btn-add-stop"
                className="py-2.5 px-3 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Stop</span>
              </button>

              {onOpenCurate && (
                <button
                  onClick={onOpenCurate}
                  id="sidebar-btn-curate"
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border border-emerald-400/30"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Gemini Curate</span>
                </button>
              )}
            </div>

            {/* Overnight Hotel Recommendation Card */}
            {activeDayPlan && (
              <div className="mt-4 p-3.5 bg-gradient-to-br from-stone-50 to-emerald-50/30 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="flex items-center gap-2 mb-1 text-xs font-bold text-stone-900">
                  <Hotel className="w-4 h-4 text-emerald-700" />
                  <span>Overnight Stay Suggestion</span>
                </div>
                <div className="text-xs font-bold text-emerald-950 mt-1">
                  {activeDayPlan.hotelSuggestion.name}
                </div>
                <div className="text-[11px] text-stone-500">
                  📍 {activeDayPlan.hotelSuggestion.area}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-amber-700 font-bold">
                    ★ {activeDayPlan.hotelSuggestion.rating} / 5.0
                  </span>
                  <span className="font-semibold text-stone-800">
                    ~₹{activeDayPlan.hotelSuggestion.pricePerNight.toLocaleString('en-IN')}{' '}
                    <span className="text-stone-400 font-normal">/ night</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
