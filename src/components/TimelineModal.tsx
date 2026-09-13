import React from 'react';
import {
  X,
  Clock,
  Car,
  AlertCircle,
  AlertTriangle,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { DayPlan, ItineraryStop } from '../types/kerala';
import { DAY_COLORS } from './InteractiveMap';
import { formatDuration, timeStringToMinutes, minutesToTimeString } from '../utils/geoRouting';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayPlan: DayPlan;
  onUpdateStopDuration: (day: number, stopId: string, durationMinutes: number) => void;
}

export const TimelineModal: React.FC<TimelineModalProps> = ({
  isOpen,
  onClose,
  dayPlan,
  onUpdateStopDuration,
}) => {
  if (!isOpen) return null;

  const dayColor = DAY_COLORS[(dayPlan.day - 1) % DAY_COLORS.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div
          className="px-6 py-4 text-white flex items-center justify-between shadow-sm"
          style={{ backgroundColor: dayColor }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif">
                Day {dayPlan.day} Interactive Timeline Slider
              </h3>
              <p className="text-xs text-white/80">
                {dayPlan.stops.length} stops · {dayPlan.totalDistanceKm} km ·{' '}
                {formatDuration(dayPlan.totalDriveMinutes)} drive time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-stone-600">
            Slide the duration of each stop below to see downstream arrival times adapt automatically.
            Notice how staying too long triggers an alert if subsequent places close before arrival.
          </p>

          <div className="relative pl-6 border-l-2 border-dashed border-stone-300 space-y-6 my-4">
            {dayPlan.stops.map((stop, idx) => {
              const isLast = idx === dayPlan.stops.length - 1;
              const dangerAlert = stop.conflicts.find((c) => c.severity === 'danger');
              const warningAlert = stop.conflicts.find((c) => c.severity === 'warning');

              return (
                <div key={stop.id} className="relative group">
                  {/* Circle Indicator on timeline */}
                  <div
                    className="absolute -left-[31px] top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: dayColor }}
                  >
                    {idx + 1}
                  </div>

                  {/* Card */}
                  <div
                    className={`p-4 rounded-2xl border transition ${
                      dangerAlert
                        ? 'border-red-400 bg-red-50/40'
                        : warningAlert
                        ? 'border-amber-300 bg-amber-50/30'
                        : 'border-stone-200 bg-stone-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">
                          {stop.place.name}
                        </h4>
                        <div className="text-[10px] text-stone-500">
                          📍 {stop.place.district} · Official Hours:{' '}
                          <span className="font-semibold text-stone-700">
                            {stop.place.opening_hours.open} – {stop.place.opening_hours.close}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-stone-800 bg-white px-2 py-1 rounded-md border border-stone-200">
                          {stop.scheduledStartTime} – {stop.scheduledEndTime}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Duration Slider */}
                    <div className="mt-3 pt-2 border-t border-stone-200/70">
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                          Time spent at this spot:
                        </span>
                        <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-xs font-bold">
                          {formatDuration(stop.allocatedDuration)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={300}
                        step={15}
                        value={stop.allocatedDuration}
                        onChange={(e) =>
                          onUpdateStopDuration(dayPlan.day, stop.id, Number(e.target.value))
                        }
                        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                      <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                        <span>30 min (Quick view)</span>
                        <span>2 hours (Standard)</span>
                        <span>5 hours (Deep immersion)</span>
                      </div>
                    </div>

                    {/* Conflict Warnings */}
                    {dangerAlert && (
                      <div className="mt-2.5 p-2 bg-red-100 border border-red-300 text-red-900 text-xs rounded-xl flex items-center gap-2 font-bold animate-pulse">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{dangerAlert.message}</span>
                      </div>
                    )}
                    {!dangerAlert && warningAlert && (
                      <div className="mt-2.5 p-2 bg-amber-100 border border-amber-300 text-amber-900 text-xs rounded-xl flex items-center gap-2 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{warningAlert.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Drive Block to Next Stop */}
                  {!isLast && (
                    <div className="my-2 py-1 flex items-center gap-2 text-xs text-stone-600 font-medium">
                      <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                        <Car className="w-3.5 h-3.5 text-stone-700" />
                      </div>
                      <span>
                        Drive {formatDuration(stop.travelTimeToNextMinutes)} ({stop.travelDistanceToNextKm} km)
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition"
          >
            Done & Return to Map
          </button>
        </div>
      </div>
    </div>
  );
};
