import React from 'react';
import {
  Compass,
  MapPin,
  Calendar,
  CloudSun,
  Award,
  Wallet,
  Printer,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '../types/kerala';

interface NavbarProps {
  tripTitle: string;
  totalKm: number;
  totalStops: number;
  estimatedTotalCost: number;
  unlockedBadgesCount: number;
  totalBadgesCount: number;
  explorationScore: number;
  onOpenWizard: () => void;
  onOpenCurate?: () => void;
  onOpenBadges: () => void;
  onOpenWeather: () => void;
  onOpenPrint: () => void;
  onResetItinerary: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tripTitle,
  totalKm,
  totalStops,
  estimatedTotalCost,
  unlockedBadgesCount,
  totalBadgesCount,
  explorationScore,
  onOpenWizard,
  onOpenCurate,
  onOpenBadges,
  onOpenWeather,
  onOpenPrint,
  onResetItinerary,
}) => {
  return (
    <header className="bg-emerald-950 text-white border-b border-emerald-800/80 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-inner shrink-0 border border-emerald-400/30">
            <Compass className="w-5 h-5 text-emerald-100 animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white truncate font-serif">
                Kerala Discovery
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-emerald-800/80 text-emerald-300 border border-emerald-700">
                Travel Game
              </span>
            </div>
            <p className="text-xs text-emerald-300/80 truncate hidden sm:block">
              {tripTitle}
            </p>
          </div>
        </div>

        {/* Live Game Metrics & Stats Bar */}
        <div className="hidden lg:flex items-center gap-4 bg-emerald-900/60 py-1.5 px-3.5 rounded-full border border-emerald-800 text-xs">
          {/* Total Distance */}
          <div className="flex items-center gap-1.5 text-emerald-200">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-white">{totalKm} km</span>
            <span className="text-emerald-400/70 text-[11px]">road</span>
          </div>

          <div className="w-px h-3.5 bg-emerald-700/60" />

          {/* Stops Count */}
          <div className="flex items-center gap-1.5 text-emerald-200">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-white">{totalStops}</span>
            <span className="text-emerald-400/70 text-[11px]">stops</span>
          </div>

          <div className="w-px h-3.5 bg-emerald-700/60" />

          {/* Budget Meter */}
          <button
            onClick={onOpenBadges}
            className="flex items-center gap-1.5 text-emerald-200 hover:text-white transition-colors cursor-pointer"
            title="View Budget Meter"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-emerald-300">
              ₹{estimatedTotalCost.toLocaleString('en-IN')}
            </span>
          </button>

          <div className="w-px h-3.5 bg-emerald-700/60" />

          {/* Badges and Score */}
          <button
            onClick={onOpenBadges}
            className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer font-medium"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {unlockedBadgesCount}/{totalBadgesCount} Badges
            </span>
            <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold">
              {explorationScore} pts
            </span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Weather Status Toggle */}
          <button
            onClick={onOpenWeather}
            id="nav-btn-weather"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/70 transition cursor-pointer shadow-sm"
            title="Weather & Monsoon Monitor"
          >
            <CloudSun className="w-4 h-4 text-amber-300" />
            <span className="hidden md:inline">Monsoon & Weather</span>
          </button>

          {/* Badges Modal Trigger (Mobile visible) */}
          <button
            onClick={onOpenBadges}
            id="nav-btn-badges"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-emerald-700/70 transition cursor-pointer shadow-sm lg:hidden"
            title="Budget & Badges"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>₹{estimatedTotalCost.toLocaleString('en-IN')}</span>
          </button>

          {/* Print / Export */}
          <button
            onClick={onOpenPrint}
            id="nav-btn-print"
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/70 transition cursor-pointer shadow-sm flex items-center gap-1.5"
            title="Print & Share Plan"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Gemini AI Curate Button */}
          {onOpenCurate && (
            <button
              onClick={onOpenCurate}
              id="nav-btn-curate"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition cursor-pointer shadow-sm border border-emerald-400/40"
              title="Curate Places, Lunch Spots & Peaks with Gemini AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">Gemini Curate</span>
              <span className="sm:hidden">Curate</span>
            </button>
          )}

          {/* Travel Wizard */}
          <button
            onClick={onOpenWizard}
            id="nav-btn-wizard"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-emerald-950 transition cursor-pointer shadow-sm font-sans"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-950" />
            <span className="hidden sm:inline">Preferences</span>
            <span className="sm:hidden">Plan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
