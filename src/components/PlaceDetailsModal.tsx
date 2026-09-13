import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  Globe,
  Phone,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  Car,
  Compass,
  Plus,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Place } from '../types/kerala';
import { fetchPlaceDossier, OSMEnrichedDetails } from '../services/osmPlaces';

interface PlaceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place | null;
  targetDay: number;
  onAddPlaceToDay?: (place: Place, day: number) => void;
  isAlreadyAdded?: boolean;
}

export const PlaceDetailsModal: React.FC<PlaceDetailsModalProps> = ({
  isOpen,
  onClose,
  place,
  targetDay,
  onAddPlaceToDay,
  isAlreadyAdded = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [dossier, setDossier] = useState<OSMEnrichedDetails | null>(null);

  useEffect(() => {
    if (isOpen && place) {
      setLoading(true);
      fetchPlaceDossier(place.name, place.district, place.coordinates)
        .then((data) => {
          setDossier(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setDossier(null);
    }
  }, [isOpen, place]);

  if (!isOpen || !place) return null;

  const displayImage = dossier?.wikipediaThumbnail || place.image;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Hero image banner */}
        <div className="relative h-56 sm:h-64 w-full bg-stone-900 overflow-hidden shrink-0">
          <img
            src={displayImage}
            alt={place.name}
            className="w-full h-full object-cover opacity-90 transition-transform duration-500 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white shadow-md">
              {place.category.join(' • ')}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 text-stone-900 backdrop-blur-md flex items-center gap-1 shadow-md">
              <Compass className="w-3 h-3 text-emerald-600" />
              OpenStreetMap Verified
            </span>
          </div>

          {/* Title & Subtitle */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h2 className="text-xl sm:text-2xl font-bold font-serif leading-tight">
              {place.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-stone-200 mt-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {place.district} District, Kerala · Coordinates: {place.coordinates[0].toFixed(4)}°N,{' '}
                {place.coordinates[1].toFixed(4)}°E
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] text-stone-500 font-bold block">
                TYPICAL VISIT
              </span>
              <span className="font-bold text-stone-900 mt-0.5 block">
                ~{place.avg_time_spent} mins
              </span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] text-stone-500 font-bold block">
                ENTRY FEE
              </span>
              <span className="font-bold text-emerald-700 mt-0.5 block">
                {place.approx_cost > 0 ? `₹${place.approx_cost}` : 'Free Entry'}
              </span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] text-stone-500 font-bold block">
                OPENING HOURS
              </span>
              <span className="font-bold text-stone-900 mt-0.5 block">
                {dossier?.openingHours || `${place.opening_hours.open} – ${place.opening_hours.close}`}
              </span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] text-stone-500 font-bold block">
                ACCESSIBILITY
              </span>
              <span className="font-bold text-stone-900 mt-0.5 block">
                {place.senior_friendly ? 'Senior Friendly' : 'Moderate Terrain'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Overview & Highlights
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              {place.description}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {place.highlights.map((h, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-emerald-50 text-emerald-900 rounded-md text-[11px] font-semibold border border-emerald-200"
                >
                  ✓ {h}
                </span>
              ))}
            </div>
          </div>

          {/* Wikipedia Extract if available */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                Wikipedia Historical Context & Lore
              </h4>
              {dossier?.wikipediaTitle && (
                <a
                  href={`https://en.wikipedia.org/wiki/${encodeURIComponent(
                    dossier.wikipediaTitle
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                >
                  Read on Wikipedia <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-3 text-xs text-stone-500">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                Querying OpenStreetMap & Wikipedia records...
              </div>
            ) : dossier?.wikipediaExtract ? (
              <p className="text-xs text-stone-600 leading-relaxed italic">
                &ldquo;{dossier.wikipediaExtract}&rdquo;
              </p>
            ) : (
              <p className="text-xs text-stone-500">
                Located in {place.district}, this site is celebrated as part of Kerala&apos;s cultural and natural heritage.
              </p>
            )}
          </div>

          {/* OpenStreetMap Geo-Data Section */}
          <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/70 text-xs space-y-1.5">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              OSM Geocoded Address & Metadata
            </div>
            <div className="text-[11px] text-stone-600">
              <span className="font-semibold text-stone-800">Address:</span>{' '}
              {dossier?.address || `${place.name}, ${place.district}, Kerala, India`}
            </div>
            {dossier?.website && (
              <div className="text-[11px] text-stone-600 flex items-center gap-1 pt-1">
                <Globe className="w-3 h-3 text-stone-500" />
                <span className="font-semibold text-stone-800">Website:</span>{' '}
                <a
                  href={dossier.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline truncate max-w-xs"
                >
                  {dossier.website}
                </a>
              </div>
            )}
            {dossier?.wheelchair && (
              <div className="text-[11px] text-stone-600 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span className="font-semibold text-stone-800">Wheelchair Accessibility:</span>{' '}
                {dossier.wheelchair}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800"
          >
            Back
          </button>

          {onAddPlaceToDay && (
            <button
              disabled={isAlreadyAdded}
              onClick={() => {
                onAddPlaceToDay(place, targetDay);
                onClose();
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                isAlreadyAdded
                  ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                  : 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-md'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>
                {isAlreadyAdded ? 'Already in Itinerary' : `Add to Day ${targetDay}`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
