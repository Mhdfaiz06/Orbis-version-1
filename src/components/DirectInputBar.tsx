import React, { useState, useEffect } from 'react';
import { Search, MapPin, Plus, Sparkles, X, Globe, Compass, Info, Loader2 } from 'lucide-react';
import { Place } from '../types/kerala';
import { KERALA_PLACES } from '../data/keralaPlaces';
import { searchKeralaPlacesOSM } from '../services/osmPlaces';

interface DirectInputBarProps {
  onAddPlaceToDay: (place: Place, day: number) => void;
  onOpenCustomPinPrompt: (customName: string) => void;
  onInspectPlace?: (place: Place) => void;
  selectedDay: number;
}

export const DirectInputBar: React.FC<DirectInputBarProps> = ({
  onAddPlaceToDay,
  onOpenCustomPinPrompt,
  onInspectPlace,
  selectedDay,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmResults, setOsmResults] = useState<Place[]>([]);

  const targetDay = selectedDay === 0 ? 1 : selectedDay;

  // Local knowledge base search
  const localMatches = query.trim()
    ? KERALA_PLACES.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.district.toLowerCase().includes(query.toLowerCase()) ||
          p.category.some((c) => c.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 4)
    : [];

  // Debounced OpenStreetMap Nominatim Live Search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setOsmResults([]);
      setOsmLoading(false);
      return;
    }

    setOsmLoading(true);
    const timer = setTimeout(async () => {
      try {
        const livePlaces = await searchKeralaPlacesOSM(q);
        // Exclude places already in localMatches
        const localNames = new Set(localMatches.map((p) => p.name.toLowerCase()));
        const uniqueOsm = livePlaces.filter(
          (p) => !localNames.has(p.name.toLowerCase())
        );
        setOsmResults(uniqueOsm.slice(0, 5));
      } catch (err) {
        console.error('OSM search failed', err);
      } finally {
        setOsmLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectPlace = (place: Place) => {
    onAddPlaceToDay(place, targetDay);
    setQuery('');
    setIsOpen(false);
  };

  const handleCustomPin = () => {
    if (!query.trim()) return;
    onOpenCustomPinPrompt(query.trim());
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="relative flex items-center shadow-lg rounded-2xl">
        <Search className="w-4 h-4 text-emerald-600 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          id="direct-input-search"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="OpenStreetMap Search: Type any town, beach, temple or waterfall in Kerala..."
          className="w-full pl-10 pr-10 py-2.5 bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/90 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              setOsmResults([]);
            }}
            className="absolute right-3.5 text-stone-400 hover:text-stone-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="absolute right-3.5 px-1.5 py-0.5 rounded bg-stone-100 text-[10px] font-bold text-stone-500 border border-stone-200">
            OSM Live
          </span>
        )}
      </div>

      {/* Auto-suggest dropdown with Local & Live OSM Results */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden z-40 max-h-96 flex flex-col">
          <div className="p-2 border-b border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-semibold px-3 bg-stone-50">
            <span>Adding to Day {targetDay}</span>
            <span className="flex items-center gap-1">
              {osmLoading && <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />}
              {localMatches.length + osmResults.length} spots found
            </span>
          </div>

          <div className="overflow-y-auto divide-y divide-stone-100">
            {/* Local curated matches */}
            {localMatches.length > 0 && (
              <div>
                <div className="px-3 py-1 bg-emerald-50/60 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Curated Kerala Knowledge Base
                </div>
                {localMatches.map((place) => (
                  <div
                    key={place.id}
                    className="w-full p-2.5 px-3 hover:bg-emerald-50/40 text-left flex items-center gap-3 transition group"
                  >
                    <img
                      src={place.image}
                      alt={place.name}
                      className="w-9 h-9 rounded-lg object-cover shrink-0"
                    />
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => handleSelectPlace(place)}
                    >
                      <div className="text-xs font-bold text-stone-900 truncate group-hover:text-emerald-900">
                        {place.name}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        📍 {place.district} · {place.category.join(', ')} ·{' '}
                        {place.opening_hours.open}–{place.opening_hours.close}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {onInspectPlace && (
                        <button
                          title="View OpenStreetMap & Wikipedia Info"
                          onClick={() => onInspectPlace(place)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-700 hover:bg-white border border-stone-200"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleSelectPlace(place)}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Live OpenStreetMap Results */}
            {osmResults.length > 0 && (
              <div>
                <div className="px-3 py-1 bg-sky-50/60 text-[10px] font-bold text-sky-800 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    OpenStreetMap Live Places in Kerala
                  </span>
                  <span className="text-[9px] lowercase font-normal text-sky-600">
                    Real OSM Geo-records
                  </span>
                </div>
                {osmResults.map((place) => (
                  <div
                    key={place.id}
                    className="w-full p-2.5 px-3 hover:bg-sky-50/40 text-left flex items-center gap-3 transition group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0 border border-sky-200">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => handleSelectPlace(place)}
                    >
                      <div className="text-xs font-bold text-stone-900 truncate group-hover:text-sky-900 flex items-center gap-1.5">
                        <span>{place.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-sky-100 text-sky-700 rounded font-semibold">
                          OSM
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 truncate">
                        📍 {place.district} · {place.category.join(', ')} ·{' '}
                        {place.coordinates[0].toFixed(2)}°N, {place.coordinates[1].toFixed(2)}°E
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {onInspectPlace && (
                        <button
                          title="View OpenStreetMap & Wikipedia Info"
                          onClick={() => onInspectPlace(place)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-sky-700 hover:bg-white border border-stone-200"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleSelectPlace(place)}
                        className="flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-100 hover:bg-sky-200 px-2.5 py-1 rounded-lg transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Pin Fallback */}
            <button
              onClick={handleCustomPin}
              className="w-full p-3 hover:bg-amber-50/70 text-left flex items-center gap-3 transition bg-amber-50/20"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-amber-900">
                  Drop Custom Pin: &ldquo;{query}&rdquo;
                </div>
                <div className="text-[10px] text-amber-700">
                  Click map to place custom pin and append to Day {targetDay}
                </div>
              </div>
              <span className="text-xs font-bold text-amber-800 shrink-0">Pin Gem →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
