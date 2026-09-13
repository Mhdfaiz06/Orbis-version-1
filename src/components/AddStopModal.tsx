import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  MapPin,
  Clock,
  ShieldCheck,
  Filter,
  Globe,
  Loader2,
  Info,
  Mountain,
  Utensils,
  Compass,
  Sparkles,
} from 'lucide-react';
import { Place, Category, District } from '../types/kerala';
import { KERALA_PLACES } from '../data/keralaPlaces';
import { searchKeralaPlacesOSM } from '../services/osmPlaces';

interface AddStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDay: number;
  existingPlaceIds: string[];
  onAddPlace: (place: Place, day: number) => void;
  onInspectPlace?: (place: Place) => void;
}

export const AddStopModal: React.FC<AddStopModalProps> = ({
  isOpen,
  onClose,
  targetDay,
  existingPlaceIds,
  onAddPlace,
  onInspectPlace,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'curated' | 'overpass' | 'osm'>('curated');
  const [osmResults, setOsmResults] = useState<Place[]>([]);
  const [osmLoading, setOsmLoading] = useState(false);

  // Live Overpass API state
  const [overpassCategory, setOverpassCategory] = useState<'mountain' | 'food' | 'all'>('mountain');
  const [overpassDistrict, setOverpassDistrict] = useState<string>('All');
  const [overpassResults, setOverpassResults] = useState<Place[]>([]);
  const [overpassLoading, setOverpassLoading] = useState(false);

  const categories = ['All', 'Mountain', 'Backwaters', 'Beach', 'Wildlife', 'Historic', 'Culinary', 'Waterfall', 'Plantation'];
  const districts = ['All', 'Ernakulam', 'Idukki', 'Alappuzha', 'Thiruvananthapuram', 'Kottayam', 'Kollam', 'Thrissur', 'Wayanad', 'Kozhikode', 'Kannur', 'Kasaragod'];

  // Debounced search for OpenStreetMap
  useEffect(() => {
    if (activeTab !== 'osm') return;
    const q = search.trim();
    if (q.length < 3) {
      setOsmResults([]);
      setOsmLoading(false);
      return;
    }

    setOsmLoading(true);
    const timer = setTimeout(async () => {
      try {
        const places = await searchKeralaPlacesOSM(q);
        setOsmResults(places);
      } catch (err) {
        console.error('OSM fetch error in modal:', err);
      } finally {
        setOsmLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [search, activeTab]);

  // Load Overpass API places
  const fetchOverpassPlaces = async () => {
    setOverpassLoading(true);
    try {
      const url = `/api/fetch-live-places?category=${encodeURIComponent(overpassCategory)}&district=${encodeURIComponent(overpassDistrict)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.places && Array.isArray(data.places)) {
        setOverpassResults(data.places);
      }
    } catch (err) {
      console.error('Overpass fetch error:', err);
    } finally {
      setOverpassLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overpass' && overpassResults.length === 0) {
      fetchOverpassPlaces();
    }
  }, [activeTab]);

  if (!isOpen) return null;

  const filteredCurated = KERALA_PLACES.filter((p) => {
    const q = search.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.foodSpecialty && p.foodSpecialty.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === 'All' || p.category.includes(selectedCategory as Category);

    const matchesDistrict =
      selectedDistrict === 'All' || p.district === selectedDistrict;

    return matchesQuery && matchesCategory && matchesDistrict;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-800">
          <div>
            <h3 className="text-base font-bold font-serif">
              Add Attraction or Food Stop to Day {targetDay}
            </h3>
            <p className="text-xs text-emerald-200">
              Curated highlights, live mountain peaks & lunch spots via Overpass API, or OpenStreetMap search
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-emerald-800 text-emerald-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200 bg-stone-100 text-xs font-bold">
          <button
            onClick={() => setActiveTab('curated')}
            className={`flex-1 py-2.5 text-center transition ${
              activeTab === 'curated'
                ? 'bg-white text-emerald-900 border-b-2 border-emerald-600'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Curated Highlights ({filteredCurated.length})
          </button>
          <button
            onClick={() => setActiveTab('overpass')}
            className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition ${
              activeTab === 'overpass'
                ? 'bg-white text-amber-900 border-b-2 border-amber-600'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Mountain className="w-3.5 h-3.5 text-amber-600" />
            Live Peaks & Food Spots
          </button>
          <button
            onClick={() => setActiveTab('osm')}
            className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition ${
              activeTab === 'osm'
                ? 'bg-white text-sky-900 border-b-2 border-sky-600'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-600" />
            OSM Search {osmLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          </button>
        </div>

        {/* Filter & Search Controls */}
        <div className="p-4 border-b border-stone-200 bg-stone-50 space-y-3">
          {activeTab === 'curated' && (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, district, peak, or food spot (e.g. Meesapulimala, Paragon, Munnar)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] font-bold text-stone-500 shrink-0">Category:</span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] font-bold text-stone-500 shrink-0">District:</span>
                {districts.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDistrict(d)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition ${
                      selectedDistrict === d
                        ? 'bg-stone-900 text-white'
                        : 'bg-white text-stone-600 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === 'overpass' && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-stone-600">Type:</span>
                  {[
                    { id: 'all', label: 'All Live Places' },
                    { id: 'mountain', label: '⛰️ Mountains & Viewpoints' },
                    { id: 'food', label: '🍲 Food & Lunch Breaks' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setOverpassCategory(t.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        overpassCategory === t.id
                          ? 'bg-amber-700 text-white shadow-xs'
                          : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={fetchOverpassPlaces}
                  disabled={overpassLoading}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
                >
                  {overpassLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Compass className="w-3.5 h-3.5" />
                  )}
                  <span>Refresh Overpass</span>
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] font-bold text-stone-500 shrink-0">District:</span>
                {districts.map((d) => (
                  <button
                    key={d}
                    onClick={() => setOverpassDistrict(d)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition ${
                      overpassDistrict === d
                        ? 'bg-stone-900 text-white'
                        : 'bg-white text-stone-600 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'osm' && (
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Type any Kerala town, village, waterfall, temple, peak or fort..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          )}
        </div>

        {/* Places list */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {activeTab === 'curated' && (
            filteredCurated.length === 0 ? (
              <div className="text-center py-12 text-xs text-stone-500">
                No matching places found. Try checking the{' '}
                <button
                  onClick={() => setActiveTab('overpass')}
                  className="text-emerald-700 font-bold underline"
                >
                  Live Peaks & Food Spots
                </button>{' '}
                tab.
              </div>
            ) : (
              filteredCurated.map((place) => {
                const alreadyAdded = existingPlaceIds.includes(place.id);
                return (
                  <div
                    key={place.id}
                    className="p-3 bg-white rounded-2xl border border-stone-200 hover:border-emerald-300 transition flex items-center gap-3 shadow-2xs"
                  >
                    <img
                      src={place.image}
                      alt={place.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="text-xs font-bold text-stone-900 truncate">
                            {place.name}
                          </h4>
                          {place.isMountain && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold rounded">
                              ⛰️ {place.elevation ? `${place.elevation}m` : 'Peak'}
                            </span>
                          )}
                          {place.isFoodSpot && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded">
                              🍲 Lunch Spot
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-800">
                          {place.approx_cost > 0 ? `₹${place.approx_cost}` : 'Free'}
                        </span>
                      </div>

                      <div className="text-[10px] text-stone-500 flex items-center gap-2 mt-0.5">
                        <span>📍 {place.district}</span>
                        <span>·</span>
                        <span>{place.category.join(', ')}</span>
                        <span>·</span>
                        <span>Open: {place.opening_hours.open}–{place.opening_hours.close}</span>
                      </div>

                      {place.foodSpecialty && (
                        <div className="text-[10px] text-amber-900 bg-amber-50/80 px-2 py-0.5 rounded-md mt-1 font-medium inline-block">
                          🍽️ Specialty: {place.foodSpecialty}
                        </div>
                      )}

                      <p className="text-[11px] text-stone-600 line-clamp-1 mt-1">
                        {place.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onInspectPlace && (
                        <button
                          onClick={() => onInspectPlace(place)}
                          title="View OpenStreetMap & Wikipedia Dossier"
                          className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        disabled={alreadyAdded}
                        onClick={() => {
                          onAddPlace(place, targetDay);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          alreadyAdded
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            : place.isFoodSpot
                            ? 'bg-amber-600 text-white hover:bg-amber-700 cursor-pointer shadow-xs'
                            : 'bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer shadow-xs'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{alreadyAdded ? 'Added' : place.isFoodSpot ? 'Add Lunch' : 'Add'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'overpass' && (
            overpassLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-xs text-stone-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                <span>Fetching live mountains, viewpoints & food spots from Overpass API...</span>
              </div>
            ) : overpassResults.length === 0 ? (
              <div className="text-center py-12 text-xs text-stone-500">
                No Overpass spots fetched. Click "Refresh Overpass" above or adjust filters.
              </div>
            ) : (
              overpassResults.map((place) => {
                const alreadyAdded = existingPlaceIds.includes(place.id);
                return (
                  <div
                    key={place.id}
                    className="p-3 bg-white rounded-2xl border border-amber-200/80 hover:border-amber-400 transition flex items-center gap-3 shadow-2xs"
                  >
                    <img
                      src={place.image}
                      alt={place.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-stone-900 truncate">
                            {place.name}
                          </h4>
                          {place.isMountain && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                              ⛰️ {place.elevation ? `${place.elevation}m` : 'Peak'}
                            </span>
                          )}
                          {place.isFoodSpot && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded border border-amber-200">
                              🍲 Lunch Spot
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-500">
                          {place.coordinates[0].toFixed(3)}°N, {place.coordinates[1].toFixed(3)}°E
                        </span>
                      </div>

                      <div className="text-[10px] text-stone-500 mt-0.5">
                        📍 {place.district} · {place.category.join(', ')} · Approx: ₹{place.approx_cost}
                      </div>

                      {place.foodSpecialty && (
                        <div className="text-[10px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md mt-1 font-medium inline-block">
                          🍽️ Specialty: {place.foodSpecialty}
                        </div>
                      )}

                      <p className="text-[11px] text-stone-600 line-clamp-1 mt-0.5">
                        {place.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onInspectPlace && (
                        <button
                          onClick={() => onInspectPlace(place)}
                          title="View OpenStreetMap & Wikipedia Dossier"
                          className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        disabled={alreadyAdded}
                        onClick={() => {
                          onAddPlace(place, targetDay);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          alreadyAdded
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            : 'bg-amber-700 text-white hover:bg-amber-800 cursor-pointer shadow-xs'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{alreadyAdded ? 'Added' : place.isFoodSpot ? 'Add Lunch' : 'Add'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'osm' && (
            osmLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-xs text-stone-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                <span>Searching OpenStreetMap database across Kerala...</span>
              </div>
            ) : osmResults.length === 0 ? (
              <div className="text-center py-12 text-xs text-stone-500">
                {search.trim().length < 3
                  ? 'Type at least 3 characters above to query real-time OpenStreetMap records.'
                  : 'No OpenStreetMap records found for this query in Kerala. Try another search.'}
              </div>
            ) : (
              osmResults.map((place) => {
                const alreadyAdded = existingPlaceIds.includes(place.id);
                return (
                  <div
                    key={place.id}
                    className="p-3 bg-white rounded-2xl border border-sky-200 hover:border-sky-400 transition flex items-center gap-3 shadow-2xs"
                  >
                    <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0 border border-sky-200">
                      <Globe className="w-5 h-5 text-sky-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-stone-900 truncate">
                            {place.name}
                          </h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded">
                            OSM
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-500">
                          {place.coordinates[0].toFixed(3)}°N, {place.coordinates[1].toFixed(3)}°E
                        </span>
                      </div>

                      <div className="text-[10px] text-stone-500 mt-0.5 truncate">
                        📍 {place.district} · {place.category.join(', ')} · Hours:{' '}
                        {place.opening_hours.open}–{place.opening_hours.close}
                      </div>

                      <p className="text-[11px] text-stone-600 line-clamp-1 mt-0.5">
                        {place.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onInspectPlace && (
                        <button
                          onClick={() => onInspectPlace(place)}
                          title="View OpenStreetMap & Wikipedia Dossier"
                          className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        disabled={alreadyAdded}
                        onClick={() => {
                          onAddPlace(place, targetDay);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          alreadyAdded
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            : 'bg-sky-700 text-white hover:bg-sky-800 cursor-pointer shadow-xs'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{alreadyAdded ? 'Added' : 'Add'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
