import React from 'react';
import {
  X,
  CloudSun,
  CloudRain,
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { REGIONAL_WEATHER_DATA } from '../data/keralaPlaces';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-900 to-teal-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-700/50 border border-sky-400/40 flex items-center justify-center">
              <CloudSun className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif">
                Kerala Monsoon & Weather Radar
              </h3>
              <p className="text-xs text-sky-200">
                Highlands vs Backwaters live microclimate status & travel advisories
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-sky-800 text-sky-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Kerala Microclimate Note: </span>
              Kerala experiences two monsoons — Edavappathi (Southwest, June–August) and Thulavarsham (Northeast, October–November). Highland regions (Munnar/Wayanad) receive cooler mist and periodic mountain showers, while coastal zones (Alleppey/Kochi) remain warm and tropical.
            </div>
          </div>

          <div className="space-y-3">
            {REGIONAL_WEATHER_DATA.map((w, index) => (
              <div
                key={index}
                className="p-4 rounded-2xl bg-stone-50 border border-stone-200 hover:border-sky-300 transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                      {w.region} Zone
                    </span>
                    <h4 className="text-sm font-bold text-stone-900 mt-1">
                      {w.name}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-stone-900">
                      {w.tempC}°C
                    </span>
                    <div className="text-[11px] text-stone-500 font-medium">
                      {w.condition}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-stone-600 my-2 pt-2 border-t border-stone-200">
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-blue-500" />
                    <span>Humidity: {w.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CloudRain className="w-3.5 h-3.5 text-sky-600" />
                    <span>Rain Probability: {w.rainChance}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-700 font-semibold">
                      ● {w.monsoonStatus}
                    </span>
                  </div>
                </div>

                {w.alert && (
                  <div className="mt-2 text-[11px] text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200">
                    💡 <span className="font-semibold text-stone-800">Tip:</span> {w.alert}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-sky-900 text-white hover:bg-sky-800 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
