import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Place, DayPlan } from '../types/kerala';
import { KERALA_PLACES } from '../data/keralaPlaces';
import { fetchOSRMRoute, OSRMRouteResult } from '../services/osrmRouting';
import { formatDuration } from '../utils/geoRouting';
import { Plus, Compass, Layers, MapPin, Eye, Info, Car, Mountain } from 'lucide-react';

interface InteractiveMapProps {
  dayPlans: DayPlan[];
  selectedDay: number; // 0 for all days, or 1, 2, 3...
  onSelectPlace: (place: Place) => void;
  onAddPlaceToDay: (place: Place, targetDay: number) => void;
  onAddCustomPin: (name: string, coordinates: [number, number], targetDay: number) => void;
  onInspectPlace?: (place: Place) => void;
}

export const DAY_COLORS = [
  '#059669', // Emerald (Day 1)
  '#0284c7', // Sky blue (Day 2)
  '#d97706', // Amber (Day 3)
  '#7c3aed', // Purple (Day 4)
  '#e11d48', // Rose (Day 5)
  '#0d9488', // Teal (Day 6)
  '#ea580c', // Orange (Day 7)
];

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  Beach: '🏖️',
  Backwaters: '🛶',
  Mountain: '⛰️',
  Wildlife: '🐘',
  Historic: '🏰',
  Culinary: '🍲',
  Religious: '🛕',
  Waterfall: '🌊',
  Culture: '🎭',
  Plantation: '🌿',
  Trekking: '🥾',
};

interface MapLayerConfig {
  id: string;
  name: string;
  url: string;
  attribution: string;
  subdomains: string;
  maxZoom: number;
}

const MAP_LAYERS: MapLayerConfig[] = [
  {
    id: 'carto',
    name: 'Carto Voyager (Clear & Fast)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  {
    id: 'osm',
    name: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: 'abc', // CRITICAL: OpenStreetMap only has a, b, c. Subdomain d causes DNS failure and gray tile rectangles
    maxZoom: 19,
  },
  {
    id: 'positron',
    name: 'Carto Light (Clean)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  {
    id: 'topo',
    name: 'Western Ghats Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap, SRTM &copy; OpenTopoMap',
    subdomains: 'abc', // CRITICAL: OpenTopoMap only has a, b, c
    maxZoom: 17,
  },
];

// Factory to create rock-solid Leaflet tile layers with auto-recovery on error
function createLeafletTileLayer(layerDef: MapLayerConfig): L.TileLayer {
  const layer = L.tileLayer(layerDef.url, {
    attribution: layerDef.attribution,
    subdomains: layerDef.subdomains,
    maxZoom: layerDef.maxZoom,
    minZoom: 6,
    keepBuffer: 3, // Conservative buffer prevents exhausting browser HTTP connection pools
    updateWhenIdle: false,
    updateInterval: 120,
    crossOrigin: true,
  });

  // Automatic tile error retry: if a tile drops due to network hiccup or rate limiting,
  // re-fetch it instead of leaving a blank gray box on the map
  layer.on('tileerror', (errorEvent: any) => {
    const tile = errorEvent.tile as HTMLImageElement;
    if (!tile) return;
    const retryCount = (tile as any)._retryCount || 0;
    if (retryCount < 2) {
      (tile as any)._retryCount = retryCount + 1;
      setTimeout(() => {
        if (errorEvent.coords) {
          tile.src = layer.getTileUrl(errorEvent.coords);
        }
      }, 300 * (retryCount + 1));
    }
  });

  return layer;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  dayPlans,
  selectedDay,
  onSelectPlace,
  onAddPlaceToDay,
  onAddCustomPin,
  onInspectPlace,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeLayerId, setActiveLayerId] = useState('carto');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isDropPinMode, setIsDropPinMode] = useState(false);
  const [customPinCoords, setCustomPinCoords] = useState<[number, number] | null>(null);
  const [customPinName, setCustomPinName] = useState('');
  const [customPinModalOpen, setCustomPinModalOpen] = useState(false);
  const [showAllDatabasePlaces, setShowAllDatabasePlaces] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered around central Kerala
    const map = L.map(mapContainerRef.current, {
      center: [10.15, 76.5],
      zoom: 8,
      minZoom: 7,
      maxZoom: 18,
      zoomControl: false,
    });

    // Zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial tile layer
    const initialLayer = MAP_LAYERS[0];
    const tileLayer = createLeafletTileLayer(initialLayer);
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Smooth, debounced resize observer to prevent chunk glitches during UI layout changes
    let resizeDebounce: any = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeDebounce) clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ pan: false });
        }
      }, 80);
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Staggered size invalidation on initial load to ensure all tiles render cleanly across layouts
    const initTimers = [
      setTimeout(() => map.invalidateSize({ pan: false }), 60),
      setTimeout(() => map.invalidateSize({ pan: false }), 200),
      setTimeout(() => map.invalidateSize({ pan: false }), 500),
    ];

    // Handle map clicks in Drop Pin Mode
    map.on('click', (e: L.LeafletMouseEvent) => {
      if ((window as any).__keralaDropPinMode) {
        const coords: [number, number] = [
          Math.round(e.latlng.lat * 10000) / 10000,
          Math.round(e.latlng.lng * 10000) / 10000,
        ];
        setCustomPinCoords(coords);
        setCustomPinName('');
        setCustomPinModalOpen(true);
      }
    });

    return () => {
      initTimers.forEach(clearTimeout);
      if (resizeDebounce) clearTimeout(resizeDebounce);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Change Tile Layer smoothly without rendering chunk glitches or gray blocks
  const handleSwitchLayer = (layerId: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const layerDef = MAP_LAYERS.find((l) => l.id === layerId) || MAP_LAYERS[0];
    const newTileLayer = createLeafletTileLayer(layerDef);
    newTileLayer.addTo(map);

    const oldTileLayer = tileLayerRef.current;

    // Gracefully clean up previous layer after new layer starts populating
    setTimeout(() => {
      if (oldTileLayer && map.hasLayer(oldTileLayer)) {
        map.removeLayer(oldTileLayer);
      }
    }, 250);

    // Ensure layerGroup (markers & routes) stays on top
    if (layerGroupRef.current) {
      layerGroupRef.current.bringToFront();
    }

    tileLayerRef.current = newTileLayer;
    setActiveLayerId(layerId);
    setShowLayerMenu(false);

    // Invalidate size immediately and after slight delay to ensure all chunk tiles render cleanly
    map.invalidateSize({ pan: false });
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ pan: false });
      }
    }, 120);
  };

  // Sync window global for click handler
  useEffect(() => {
    (window as any).__keralaDropPinMode = isDropPinMode;
  }, [isDropPinMode]);

  // Render Markers and OSRM Polylines with strict cancellation tokens
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    let isCurrentEffect = true;
    layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    // Determine which days to display
    const visibleDays =
      selectedDay === 0
        ? dayPlans
        : dayPlans.filter((d) => d.day === selectedDay);

    // Track planned place IDs to distinguish scheduled vs background spots
    const scheduledPlaceIds = new Set<string>();
    visibleDays.forEach((dp) => {
      dp.stops.forEach((s) => scheduledPlaceIds.add(s.place.id));
    });

    // 1. Fetch & Render Real OSRM Road Routes for each day
    visibleDays.forEach((dayPlan) => {
      const color = DAY_COLORS[(dayPlan.day - 1) % DAY_COLORS.length];
      const stops = dayPlan.stops;

      if (stops.length > 1) {
        for (let i = 0; i < stops.length - 1; i++) {
          const stopA = stops[i];
          const stopB = stops[i + 1];

          // Fetch OSRM real road coordinates
          fetchOSRMRoute(
            stopA.place.coordinates,
            stopB.place.coordinates,
            stopA.place.district,
            stopB.place.district
          ).then((routeResult: OSRMRouteResult) => {
            if (!isCurrentEffect || !layerGroupRef.current) return;

            // Outer glowing shadow line
            L.polyline(routeResult.coordinates, {
              color,
              weight: 7,
              opacity: 0.35,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(layerGroupRef.current);

            // Core road line
            const roadLine = L.polyline(routeResult.coordinates, {
              color,
              weight: 3.5,
              opacity: 0.95,
              dashArray: routeResult.isRealRoad ? undefined : '6, 6',
              lineCap: 'round',
            }).addTo(layerGroupRef.current);

            // Tooltip on road path with real OSRM travel predictions
            const roadTooltip = `
              <div style="font-family: sans-serif; font-size: 11px; padding: 2px;">
                <div style="font-weight: bold; color: ${color};">Day ${dayPlan.day} Road Path</div>
                <div style="color: #334155;">🚗 ${routeResult.summaryRoads[0] || 'Kerala Highway'}</div>
                <div style="font-weight: 600; color: #0f172a; margin-top: 2px;">
                  ${routeResult.distanceKm} km · Predicted drive: ${formatDuration(routeResult.durationMinutes)}
                </div>
              </div>
            `;
            roadLine.bindTooltip(roadTooltip, { sticky: true, className: 'osm-route-tooltip' });
          });
        }
      }
    });

    // 2. Render Scheduled Stops as Hero Markers
    visibleDays.forEach((dayPlan) => {
      const color = DAY_COLORS[(dayPlan.day - 1) % DAY_COLORS.length];

      dayPlan.stops.forEach((stop, index) => {
        const [lat, lng] = stop.place.coordinates;
        bounds.extend([lat, lng]);
        hasPoints = true;

        const categoryIcon = CATEGORY_EMOJI_MAP[stop.place.category[0]] || '📍';

        // Custom HTML marker
        const iconHtml = `
          <div class="kerala-stop-inner" style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="
              width: 38px;
              height: 38px;
              border-radius: 50%;
              background: ${color};
              border: 3px solid #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              position: relative;
            ">
              <span>${categoryIcon}</span>
            </div>
            <div style="
              position: absolute;
              top: -6px;
              right: -6px;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #111827;
              border: 2px solid #ffffff;
              color: #fef08a;
              font-size: 10px;
              font-weight: 800;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              ${index + 1}
            </div>
            <div style="
              margin-top: 3px;
              background: rgba(15, 23, 42, 0.9);
              backdrop-filter: blur(4px);
              color: #f8fafc;
              font-size: 10px;
              font-weight: 700;
              padding: 2px 6px;
              border-radius: 4px;
              white-space: nowrap;
              border: 1px solid rgba(255,255,255,0.2);
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            ">
              ${stop.place.name.length > 20 ? stop.place.name.substring(0, 18) + '...' : stop.place.name}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'kerala-stop-marker',
          iconSize: [40, 60],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(layerGroup);

        // Interactive Popup container with Inspection button
        const popupDiv = document.createElement('div');
        popupDiv.style.width = '240px';
        popupDiv.style.fontFamily = 'sans-serif';
        popupDiv.style.fontSize = '12px';
        popupDiv.innerHTML = `
          <img src="${stop.place.image}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
          <div style="font-weight: 700; font-size: 14px; color: #064e3b; margin-bottom: 2px;">${stop.place.name}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
            📍 ${stop.place.district} · Day ${stop.day} Stop #${index + 1}
          </div>
          <div style="background: #f1f5f9; padding: 6px 8px; border-radius: 6px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="color: #475569;">⏰ Timing:</span>
              <span style="font-weight: 600; color: #0f172a;">${stop.scheduledStartTime} - ${stop.scheduledEndTime}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #475569;">🎫 Entry Fee:</span>
              <span style="font-weight: 600; color: #059669;">${stop.place.approx_cost > 0 ? '₹' + stop.place.approx_cost : 'Free'}</span>
            </div>
          </div>
          <p style="color: #334155; font-size: 11px; line-height: 1.4; margin-bottom: 8px;">${stop.place.description}</p>
        `;

        if (onInspectPlace) {
          const inspectBtn = document.createElement('button');
          inspectBtn.innerHTML = '🔍 View OpenStreetMap & Wiki Details';
          inspectBtn.style.width = '100%';
          inspectBtn.style.padding = '6px 8px';
          inspectBtn.style.background = '#0284c7';
          inspectBtn.style.color = '#ffffff';
          inspectBtn.style.fontWeight = '700';
          inspectBtn.style.borderRadius = '6px';
          inspectBtn.style.border = 'none';
          inspectBtn.style.cursor = 'pointer';
          inspectBtn.style.fontSize = '11px';
          inspectBtn.onclick = () => {
            onInspectPlace(stop.place);
            marker.closePopup();
          };
          popupDiv.appendChild(inspectBtn);
        }

        marker.bindPopup(popupDiv);
      });
    });

    // 3. Render Unscheduled Knowledge Base Places (as subtle discoverable pins)
    if (showAllDatabasePlaces) {
      KERALA_PLACES.forEach((place) => {
        if (scheduledPlaceIds.has(place.id)) return; // already rendered as hero stop

        const [lat, lng] = place.coordinates;
        if (!hasPoints) {
          bounds.extend([lat, lng]);
        }

        const isFood = place.isFoodSpot || place.category.includes('Culinary');
        const isPeak = place.isMountain || place.category.includes('Mountain');
        const categoryIcon = isFood ? '🥘' : isPeak ? '⛰️' : (CATEGORY_EMOJI_MAP[place.category[0]] || '📍');
        const borderColor = isFood ? '#d97706' : isPeak ? '#4f46e5' : '#059669';

        const subtleIconHtml = `
          <div class="kerala-stop-inner" style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #ffffff;
            border: 2.5px solid ${borderColor};
            box-shadow: 0 2px 6px rgba(0,0,0,0.18);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            cursor: pointer;
            opacity: 0.9;
          ">
            <span>${categoryIcon}</span>
          </div>
        `;

        const subtleIcon = L.divIcon({
          html: subtleIconHtml,
          className: 'kerala-db-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([lat, lng], { icon: subtleIcon }).addTo(layerGroup);

        const targetDay = selectedDay === 0 ? 1 : selectedDay;

        const popupContent = document.createElement('div');
        popupContent.style.width = '240px';
        popupContent.style.fontFamily = 'sans-serif';
        popupContent.style.fontSize = '12px';
        popupContent.innerHTML = `
          <img src="${place.image}" style="width: 100%; height: 105px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
          <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${place.name}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">📍 ${place.district} · ${place.category.join(', ')}</div>
          ${place.elevation ? `<div style="font-size: 10px; font-weight: 700; color: #4338ca; margin-bottom: 4px;">🏔️ Elevation: ${place.elevation} meters above sea level</div>` : ''}
          ${place.foodSpecialty ? `<div style="font-size: 11px; font-weight: 600; color: #92400e; background: #fef3c7; padding: 4px 6px; border-radius: 6px; margin-bottom: 6px;">🍽️ Specialty: ${place.foodSpecialty}</div>` : ''}
          <p style="color: #334155; font-size: 11px; line-height: 1.4; margin-bottom: 8px;">${place.description}</p>
        `;

        const buttonGroup = document.createElement('div');
        buttonGroup.style.display = 'flex';
        buttonGroup.style.flexDirection = 'column';
        buttonGroup.style.gap = '4px';

        const addBtn = document.createElement('button');
        addBtn.innerText = isFood ? `🍱 Add as Lunch Stop (Day ${targetDay})` : `+ Add to Day ${targetDay}`;
        addBtn.style.width = '100%';
        addBtn.style.padding = '6px 12px';
        addBtn.style.background = isFood ? '#d97706' : '#059669';
        addBtn.style.color = '#ffffff';
        addBtn.style.fontWeight = '700';
        addBtn.style.borderRadius = '6px';
        addBtn.style.border = 'none';
        addBtn.style.cursor = 'pointer';
        addBtn.style.fontSize = '11px';
        addBtn.onclick = () => {
          onAddPlaceToDay(place, targetDay);
          marker.closePopup();
        };
        buttonGroup.appendChild(addBtn);

        if (onInspectPlace) {
          const infoBtn = document.createElement('button');
          infoBtn.innerText = '🔍 OSM Details & History';
          infoBtn.style.width = '100%';
          infoBtn.style.padding = '5px 12px';
          infoBtn.style.background = '#f1f5f9';
          infoBtn.style.color = '#0f172a';
          infoBtn.style.fontWeight = '600';
          infoBtn.style.borderRadius = '6px';
          infoBtn.style.border = '1px solid #cbd5e1';
          infoBtn.style.cursor = 'pointer';
          infoBtn.style.fontSize = '10px';
          infoBtn.onclick = () => {
            onInspectPlace(place);
            marker.closePopup();
          };
          buttonGroup.appendChild(infoBtn);
        }

        popupContent.appendChild(buttonGroup);
        marker.bindPopup(popupContent);
      });
    }

    // Auto fit bounds smoothly without abrupt camera teleportation
    if (hasPoints && bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: selectedDay === 0 ? 9 : 11,
      });
    }

    const timer = setTimeout(() => {
      if (isCurrentEffect && mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ pan: false });
      }
    }, 150);

    return () => {
      isCurrentEffect = false;
      clearTimeout(timer);
    };
  }, [dayPlans, selectedDay, showAllDatabasePlaces, onInspectPlace]);

  // Handle custom pin creation
  const handleSaveCustomPin = () => {
    if (!customPinCoords || !customPinName.trim()) return;
    const targetDay = selectedDay === 0 ? 1 : selectedDay;
    onAddCustomPin(customPinName.trim(), customPinCoords, targetDay);
    setCustomPinModalOpen(false);
    setIsDropPinMode(false);
    setCustomPinCoords(null);
    setCustomPinName('');
  };

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Leaflet Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls & Overlays */}
      <div className="absolute top-20 left-4 z-10 flex flex-col gap-2">
        {/* Layer Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="p-2.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-md hover:bg-white text-stone-700 border border-stone-200 transition flex items-center gap-1.5 text-xs font-bold"
            title="Switch Map Layers"
          >
            <Layers className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">OSM Layers</span>
          </button>

          {showLayerMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden py-1 z-30">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-stone-400">
                Map Basemap
              </div>
              {MAP_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => handleSwitchLayer(layer.id)}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition ${
                    activeLayerId === layer.id
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span>{layer.name}</span>
                  {activeLayerId === layer.id && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Drop Pin Mode Button */}
        <button
          onClick={() => setIsDropPinMode(!isDropPinMode)}
          className={`p-2.5 rounded-2xl backdrop-blur-md shadow-md border transition flex items-center gap-1.5 text-xs font-bold ${
            isDropPinMode
              ? 'bg-amber-600 text-white border-amber-700 animate-pulse'
              : 'bg-white/95 text-stone-700 border-stone-200 hover:bg-white'
          }`}
          title="Click to drop a custom pin anywhere in Kerala"
        >
          <MapPin className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isDropPinMode ? 'Click Map to Pin' : 'Drop Custom Pin'}
          </span>
        </button>

        {/* Toggle Discoverable Places */}
        <button
          onClick={() => setShowAllDatabasePlaces(!showAllDatabasePlaces)}
          className={`p-2.5 rounded-2xl backdrop-blur-md shadow-md border transition flex items-center gap-1.5 text-xs font-bold ${
            showAllDatabasePlaces
              ? 'bg-white/95 text-emerald-800 border-stone-200 hover:bg-white'
              : 'bg-stone-200/80 text-stone-500 border-stone-300'
          }`}
          title="Toggle visibility of unassigned Kerala discoveries on map"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">
            {showAllDatabasePlaces ? 'All Gems (Visible)' : 'All Gems (Hidden)'}
          </span>
        </button>
      </div>

      {/* Drop Pin Active Banner */}
      {isDropPinMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-amber-500 text-amber-950 px-4 py-2 rounded-2xl shadow-xl border border-amber-600 text-xs font-bold flex items-center gap-2 animate-bounce-short">
          <MapPin className="w-4 h-4 text-white" />
          <span>Click anywhere on Kerala to place your custom gem!</span>
          <button
            onClick={() => setIsDropPinMode(false)}
            className="ml-2 text-[10px] bg-amber-950 text-amber-100 px-2 py-0.5 rounded-lg"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Custom Pin Naming Modal */}
      {customPinModalOpen && customPinCoords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base font-serif">Name Your Kerala Discovery</h3>
            </div>
            <p className="text-xs text-stone-600">
              Coordinates: {customPinCoords[0].toFixed(4)}°N, {customPinCoords[1].toFixed(4)}°E.
              This gem will be added to Day {selectedDay === 0 ? 1 : selectedDay}.
            </p>
            <input
              type="text"
              placeholder="e.g., Secret Waterfall, Toddy Shop, Tea Stalls..."
              value={customPinName}
              onChange={(e) => setCustomPinName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setCustomPinModalOpen(false);
                  setIsDropPinMode(false);
                }}
                className="px-3.5 py-1.5 text-xs text-stone-600 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomPin}
                disabled={!customPinName.trim()}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 disabled:opacity-50"
              >
                Save to Itinerary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
