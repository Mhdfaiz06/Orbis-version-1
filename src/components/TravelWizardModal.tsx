import React, { useState } from 'react';
import {
  X,
  Users,
  Clock,
  Compass,
  MapPin,
  Sparkles,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  Calendar,
  ShieldCheck,
  Search,
} from 'lucide-react';
import {
  UserPreferences,
  TravelStyle,
  Category,
  Traveler,
  Place,
} from '../types/kerala';
import { START_HUBS, KERALA_PLACES } from '../data/keralaPlaces';

interface TravelWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSavePreferences: (updated: UserPreferences) => void;
}

const ALL_CATEGORIES: { id: Category; label: string; icon: string; desc: string }[] = [
  { id: 'Mountain', label: 'Misty Mountains', icon: '⛰️', desc: 'Tea slopes & Western Ghat peaks' },
  { id: 'Backwaters', label: 'Backwaters', icon: '🛶', desc: 'Houseboats, lagoons & canal cruises' },
  { id: 'Beach', label: 'Golden Beaches', icon: '🏖️', desc: 'Arabian sea cliffs & drive-ins' },
  { id: 'Wildlife', label: 'Wildlife & Safaris', icon: '🐘', desc: 'Elephants, tigers & bird reserves' },
  { id: 'Historic', label: 'Heritage & Forts', icon: '🏰', desc: 'Dutch palaces & colonial stone forts' },
  { id: 'Culinary', label: 'Culinary Trails', icon: '🍲', desc: 'Malabar biryani, seafood & halwa' },
  { id: 'Religious', label: 'Sacred Temples', icon: '🛕', desc: 'Dravidian architecture & festivals' },
  { id: 'Waterfall', label: 'Waterfalls', icon: '🌊', desc: 'Athirappilly & rainforest cascades' },
  { id: 'Culture', label: 'Culture & Theyyam', icon: '🎭', desc: 'Kathakali, Theyyam & martial arts' },
  { id: 'Plantation', label: 'Spice & Tea Estates', icon: '🌿', desc: 'Cardamom walks & tea factories' },
  { id: 'Trekking', label: 'Highland Treks', icon: '🥾', desc: 'Caves & rugged forest paths' },
];

export const TravelWizardModal: React.FC<TravelWizardModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
}) => {
  const [activeTab, setActiveTab] = useState<'group' | 'style' | 'interests' | 'mustVisit'>('group');
  
  // Local state for editing
  const [travelers, setTravelers] = useState<Traveler[]>(preferences.travelers);
  const [style, setStyle] = useState<TravelStyle>(preferences.style);
  const [days, setDays] = useState<number>(preferences.days);
  const [startHubId, setStartHubId] = useState<string>(preferences.startHubId);
  const [categories, setCategories] = useState<Category[]>(preferences.categories);
  const [mustVisitPlaceIds, setMustVisitPlaceIds] = useState<string[]>(preferences.mustVisitPlaceIds);
  const [budgetLevel, setBudgetLevel] = useState<'budget' | 'standard' | 'luxury'>(preferences.budgetLevel);
  const [mustVisitSearch, setMustVisitSearch] = useState<string>('');

  if (!isOpen) return null;

  // Senior detection
  const hasSenior = travelers.some((t) => t.age >= 60);
  const hasKids = travelers.some((t) => t.age <= 12);

  const handleAddTraveler = () => {
    const newId = `trav_${Date.now()}`;
    setTravelers([...travelers, { id: newId, name: `Traveler ${travelers.length + 1}`, age: 30 }]);
  };

  const handleRemoveTraveler = (id: string) => {
    if (travelers.length <= 1) return;
    setTravelers(travelers.filter((t) => t.id !== id));
  };

  const handleUpdateTraveler = (id: string, name: string, age: number) => {
    setTravelers(
      travelers.map((t) => (t.id === id ? { ...t, name, age: Math.max(1, age || 1) } : t))
    );
  };

  const toggleCategory = (cat: Category) => {
    if (categories.includes(cat)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== cat));
      }
    } else {
      setCategories([...categories, cat]);
    }
  };

  const toggleMustVisit = (placeId: string) => {
    if (mustVisitPlaceIds.includes(placeId)) {
      setMustVisitPlaceIds(mustVisitPlaceIds.filter((id) => id !== placeId));
    } else {
      if (mustVisitPlaceIds.length >= 4) {
        alert('You can select up to 4 primary must-visit anchor stops.');
        return;
      }
      setMustVisitPlaceIds([...mustVisitPlaceIds, placeId]);
    }
  };

  const handleApply = () => {
    onSavePreferences({
      travelers,
      style,
      days,
      startHubId,
      categories,
      mustVisitPlaceIds,
      budgetLevel,
    });
    onClose();
  };

  // Filtered places for must-visit selector
  const filteredPlaces = KERALA_PLACES.filter((p) => {
    const q = mustVisitSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q) ||
      p.category.some((c) => c.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/60 border border-emerald-500/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-white">Travel Wizard: Plan Your Kerala Journey</h2>
              <p className="text-xs text-emerald-200">
                Configure group dynamics, pace, must-visits, and preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-emerald-800 text-emerald-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-2 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('group')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'group'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            1. Group & Travelers ({travelers.length})
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'style'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            2. Pace & Gateway ({days} Days)
          </button>
          <button
            onClick={() => setActiveTab('interests')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'interests'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            3. Interests & Mood ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('mustVisit')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'mustVisit'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            4. Must-Visit Gems ({mustVisitPlaceIds.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: GROUP DETAILS */}
          {activeTab === 'group' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Travel Party & Age Profiling</h3>
                  <p className="text-xs text-stone-500">
                    The itinerary algorithm adapts route intensity based on senior and kid safety.
                  </p>
                </div>
                <button
                  onClick={handleAddTraveler}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Person
                </button>
              </div>

              {/* Senior Alert Notice */}
              {hasSenior && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Senior Traveler Detected (Age ≥ 60): </span>
                    The itinerary generator will automatically prioritize senior-friendly attractions (with elevator/bench accessibility), avoid harsh multi-hour mountain scrambles, and add relaxed buffer intervals.
                  </div>
                </div>
              )}

              {/* Kids Notice */}
              {hasKids && (
                <div className="p-3 bg-teal-50 border border-teal-300 rounded-xl flex items-start gap-2.5 text-xs text-teal-900">
                  <AlertCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Family / Young Travelers: </span>
                    Prioritizing kid-friendly highlights like elephant rehabilitation centres, cable cars, and gentle beaches.
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                {travelers.map((traveler, index) => (
                  <div
                    key={traveler.id}
                    className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-400">Name</label>
                        <input
                          type="text"
                          value={traveler.name}
                          onChange={(e) => handleUpdateTraveler(traveler.id, e.target.value, traveler.age)}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-400">Age</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={105}
                            value={traveler.age}
                            onChange={(e) => handleUpdateTraveler(traveler.id, traveler.name, Number(e.target.value))}
                            className="w-24 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          {traveler.age >= 60 && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              Senior
                            </span>
                          )}
                          {traveler.age <= 12 && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                              Child
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {travelers.length > 1 && (
                      <button
                        onClick={() => handleRemoveTraveler(traveler.id)}
                        className="p-2 text-stone-400 hover:text-red-600 transition"
                        title="Remove person"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Budget tier */}
              <div className="pt-3 border-t border-stone-200">
                <label className="block text-xs font-bold text-stone-800 mb-2">
                  Budget Style & Lodging Preference
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['budget', 'standard', 'luxury'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setBudgetLevel(lvl)}
                      className={`p-3 rounded-xl border text-left transition ${
                        budgetLevel === lvl
                          ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="text-xs font-bold text-stone-900 capitalize">
                        {lvl === 'budget' ? '🎒 Backpacker / Eco' : lvl === 'standard' ? '🏨 Standard Heritage' : '✨ Premium Luxury'}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {lvl === 'budget'
                          ? '₹2,500/day avg per room'
                          : lvl === 'standard'
                          ? '₹4,500/day heritage resorts'
                          : '₹7,500/day 5-star & private villas'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PACE & GATEWAY */}
          {activeTab === 'style' && (
            <div className="space-y-5">
              {/* Trip Duration */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-800">Trip Length</label>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {days} Days
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[2, 3, 4, 5, 6, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setDays(num)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        days === num
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {num} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Gateway Hub */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  Arrival Gateway / Starting Hub
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {START_HUBS.map((hub) => (
                    <button
                      key={hub.id}
                      type="button"
                      onClick={() => setStartHubId(hub.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        startHubId === hub.id
                          ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900">{hub.name}</span>
                        {startHubId === hub.id && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">{hub.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Travel Style */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  Travel Rhythm & Daily Pace
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Relaxed */}
                  <button
                    type="button"
                    onClick={() => setStyle('relaxed')}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      style === 'relaxed'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">🐢 Relaxed</span>
                      {style === 'relaxed' && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="text-[11px] text-emerald-800 font-semibold mt-1">1–2 places / day</div>
                    <p className="text-[10px] text-stone-500 mt-1">
                      Late morning starts (10:00 AM), 60 min buffer between spots, unhurried meals.
                    </p>
                  </button>

                  {/* Normal */}
                  <button
                    type="button"
                    onClick={() => setStyle('normal')}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      style === 'normal'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">🧭 Normal</span>
                      {style === 'normal' && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="text-[11px] text-emerald-800 font-semibold mt-1">3 places / day</div>
                    <p className="text-[10px] text-stone-500 mt-1">
                      Standard start (09:00 AM), balanced 30 min buffer, ideal for most trips.
                    </p>
                  </button>

                  {/* Packed */}
                  <button
                    type="button"
                    onClick={() => setStyle('packed')}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      style === 'packed'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">⚡ Packed</span>
                      {style === 'packed' && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="text-[11px] text-emerald-800 font-semibold mt-1">4–5 places / day</div>
                    <p className="text-[10px] text-stone-500 mt-1">
                      Early morning starts (07:30 AM), tight 15 min buffer, maximal coverage.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INTERESTS & MOOD */}
          {activeTab === 'interests' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">What draws you to Kerala?</h3>
                <p className="text-xs text-stone-500">
                  Select key themes. The itinerary algorithm clusters places matching your chosen passions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_CATEGORIES.map((cat) => {
                  const isSelected = categories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{cat.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900">{cat.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">{cat.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: MUST-VISIT GEMS */}
          {activeTab === 'mustVisit' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Pick Anchor Must-Visit Places</h3>
                <p className="text-xs text-stone-500">
                  Select up to 4 places you definitely want in your schedule. The engine clusters proximate attractions around them.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Munnar, Alleppey houseboat, Athirappilly, Bekal fort..."
                  value={mustVisitSearch}
                  onChange={(e) => setMustVisitSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Selected Chips */}
              {mustVisitPlaceIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-bold text-stone-500 mr-1">Selected:</span>
                  {mustVisitPlaceIds.map((id) => {
                    const place = KERALA_PLACES.find((p) => p.id === id);
                    if (!place) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"
                      >
                        {place.name}
                        <button
                          onClick={() => toggleMustVisit(id)}
                          className="hover:text-emerald-950"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Place list cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {filteredPlaces.map((place) => {
                  const isChecked = mustVisitPlaceIds.includes(place.id);
                  return (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => toggleMustVisit(place.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-3 transition ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <img
                        src={place.image}
                        alt={place.name}
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900 truncate">
                            {place.name}
                          </span>
                          {isChecked && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {place.district} · {place.category[0]}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between">
          <div className="text-xs text-stone-600">
            {travelers.length} Travelers · {days} Days · {style.toUpperCase()} Pace
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              id="wizard-generate-btn"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Generate Itinerary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
