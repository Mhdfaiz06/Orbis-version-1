import React from 'react';
import {
  X,
  Award,
  Wallet,
  Car,
  Ticket,
  Hotel,
  Utensils,
  MapPin,
  CheckCircle2,
  Compass,
  Mountain,
  Anchor,
  ShieldCheck,
} from 'lucide-react';
import { Badge, DayPlan, UserPreferences } from '../types/kerala';

interface GameStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalKm: number;
  totalDriveHours: string;
  totalStops: number;
  costBreakdown: {
    transport: number;
    entryFees: number;
    hotelStay: number;
    foodEstimate: number;
    total: number;
  };
  badges: Badge[];
  explorationScore: number;
  preferences: UserPreferences;
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  Compass: <Compass className="w-5 h-5 text-emerald-600" />,
  Mountain: <Mountain className="w-5 h-5 text-sky-600" />,
  Anchor: <Anchor className="w-5 h-5 text-teal-600" />,
  Utensils: <Utensils className="w-5 h-5 text-amber-600" />,
  Award: <Award className="w-5 h-5 text-purple-600" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5 text-green-600" />,
};

export const GameStatsModal: React.FC<GameStatsModalProps> = ({
  isOpen,
  onClose,
  totalKm,
  totalDriveHours,
  totalStops,
  costBreakdown,
  badges,
  explorationScore,
  preferences,
}) => {
  if (!isOpen) return null;

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white px-6 py-5 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg text-emerald-950">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-serif text-white">
                  Trip Achievements & Budget Meter
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/40">
                  {explorationScore}/100 Pts
                </span>
              </div>
              <p className="text-xs text-emerald-300/80">
                Real-time geospatial tracker & unlockable Kerala badges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-emerald-800/60 text-emerald-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Real-time Budget Meter */}
          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-stone-900">
                  Real-time Estimated Budget Bar
                </h4>
              </div>
              <span className="text-sm font-extrabold text-emerald-900">
                ₹{costBreakdown.total.toLocaleString('en-IN')}
              </span>
            </div>

            <p className="text-[11px] text-stone-500 mb-3">
              Calculated dynamically for {preferences.travelers.length} traveler(s) on a{' '}
              {preferences.budgetLevel} plan. Updates automatically when places are added or removed.
            </p>

            {/* Stacked Visual Bar */}
            <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden flex mb-3 shadow-inner">
              <div
                style={{
                  width: `${(costBreakdown.hotelStay / costBreakdown.total) * 100}%`,
                }}
                className="bg-emerald-600 h-full"
                title={`Hotels: ₹${costBreakdown.hotelStay}`}
              />
              <div
                style={{
                  width: `${(costBreakdown.transport / costBreakdown.total) * 100}%`,
                }}
                className="bg-sky-500 h-full"
                title={`Transport: ₹${costBreakdown.transport}`}
              />
              <div
                style={{
                  width: `${(costBreakdown.foodEstimate / costBreakdown.total) * 100}%`,
                }}
                className="bg-amber-500 h-full"
                title={`Meals: ₹${costBreakdown.foodEstimate}`}
              />
              <div
                style={{
                  width: `${(costBreakdown.entryFees / costBreakdown.total) * 100}%`,
                }}
                className="bg-purple-500 h-full"
                title={`Tickets: ₹${costBreakdown.entryFees}`}
              />
            </div>

            {/* Breakdown grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-white rounded-xl border border-stone-200">
                <div className="flex items-center gap-1 text-emerald-700 font-semibold mb-0.5">
                  <Hotel className="w-3.5 h-3.5" />
                  <span>Stays</span>
                </div>
                <div className="font-bold text-stone-900">
                  ₹{costBreakdown.hotelStay.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-2 bg-white rounded-xl border border-stone-200">
                <div className="flex items-center gap-1 text-sky-700 font-semibold mb-0.5">
                  <Car className="w-3.5 h-3.5" />
                  <span>Cab & Fuel</span>
                </div>
                <div className="font-bold text-stone-900">
                  ₹{costBreakdown.transport.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-2 bg-white rounded-xl border border-stone-200">
                <div className="flex items-center gap-1 text-amber-700 font-semibold mb-0.5">
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Food & Dining</span>
                </div>
                <div className="font-bold text-stone-900">
                  ₹{costBreakdown.foodEstimate.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-2 bg-white rounded-xl border border-stone-200">
                <div className="flex items-center gap-1 text-purple-700 font-semibold mb-0.5">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Entry Tickets</span>
                </div>
                <div className="font-bold text-stone-900">
                  ₹{costBreakdown.entryFees.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Distance & Travel Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-center">
              <div className="text-[11px] text-stone-500 font-semibold">Total Road Distance</div>
              <div className="text-lg font-extrabold text-stone-900 mt-0.5">{totalKm} km</div>
              <div className="text-[10px] text-emerald-700 font-medium">Kerala Road Network</div>
            </div>
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-center">
              <div className="text-[11px] text-stone-500 font-semibold">Total Driving Time</div>
              <div className="text-lg font-extrabold text-stone-900 mt-0.5">{totalDriveHours}</div>
              <div className="text-[10px] text-stone-500 font-medium">Ghat & Highway mix</div>
            </div>
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-center">
              <div className="text-[11px] text-stone-500 font-semibold">Stops Visited</div>
              <div className="text-lg font-extrabold text-stone-900 mt-0.5">{totalStops}</div>
              <div className="text-[10px] text-amber-700 font-medium">Kerala Gems</div>
            </div>
          </div>

          {/* Unlockable Badges Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Exploration Badges ({unlockedCount}/{badges.length} Unlocked)
              </h4>
              <span className="text-[11px] text-stone-500 font-medium">
                Add diverse places to unlock more!
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                    badge.unlocked
                      ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                      : 'border-stone-200 bg-stone-50/50 opacity-60'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      badge.unlocked
                        ? 'bg-white border-emerald-200 shadow-xs'
                        : 'bg-stone-200 border-stone-300'
                    }`}
                  >
                    {BADGE_ICONS[badge.iconName] || <Award className="w-5 h-5 text-stone-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-stone-900">{badge.title}</h5>
                      {badge.unlocked ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Unlocked
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-400 font-semibold">Locked</span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                      {badge.description}
                    </p>
                    <div className="mt-1.5 text-[10px] font-semibold text-emerald-800">
                      {badge.progressText}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition"
          >
            Close & Continue Exploring
          </button>
        </div>
      </div>
    </div>
  );
};
