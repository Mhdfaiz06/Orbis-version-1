/**
 * OpenStreetMap (Nominatim) & Wikimedia Service
 * Discovers real places in Kerala and retrieves deep location information.
 */

import { Place, Category, District, WeatherRegion } from '../types/kerala';

export interface OSMEnrichedDetails {
  osmId: string;
  name: string;
  district: string;
  category: string;
  address: string;
  coordinates: [number, number];
  openingHours?: string;
  website?: string;
  phone?: string;
  wheelchair?: string;
  wikipediaTitle?: string;
  wikipediaExtract?: string;
  wikipediaThumbnail?: string;
  tourismType?: string;
  historicType?: string;
}

const KERALA_DISTRICTS: District[] = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod',
];

// Cache for OSM place search and details
const osmCache = new Map<string, any>();

/**
 * Search places in Kerala using OpenStreetMap Nominatim API
 */
export async function searchKeralaPlacesOSM(query: string): Promise<Place[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const cacheKey = `search_${trimmed.toLowerCase()}`;
  if (osmCache.has(cacheKey)) {
    return osmCache.get(cacheKey);
  }

  try {
    // Bounded strictly to Kerala latitude (8.2 to 12.85) and longitude (74.8 to 77.5)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed + ', Kerala, India'
    )}&countrycodes=in&viewbox=74.8,12.85,77.5,8.2&bounded=0&limit=8&addressdetails=1&extratags=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`OSM search error: ${res.status}`);

    const data = await res.json();

    const places: Place[] = data
      .filter((item: any) => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        // Ensure within Kerala bounding box
        return lat >= 8.1 && lat <= 12.9 && lon >= 74.8 && lon <= 77.6;
      })
      .map((item: any) => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const address = item.address || {};
        const extratags = item.extratags || {};

        // Identify District
        const detectedDistrict = identifyDistrict(address, item.display_name);

        // Classify Category
        const category = classifyCategory(item.type, item.class, extratags, item.display_name);

        // Senior friendly if not a steep mountain trek
        const isSeniorFriendly =
          extratags.wheelchair === 'yes' ||
          (!item.display_name.toLowerCase().includes('trek') &&
            !item.display_name.toLowerCase().includes('peak'));

        // Hours
        const openingHours = extratags.opening_hours || '09:00 - 18:00';
        let open = '09:00';
        let close = '18:00';
        if (openingHours.includes('-')) {
          const parts = openingHours.split('-');
          if (parts[0]) open = parts[0].trim().slice(0, 5);
          if (parts[1]) close = parts[1].trim().slice(0, 5);
        }

        const cleanName = item.name || item.display_name.split(',')[0];

        const place: Place = {
          id: `osm_${item.osm_id}`,
          name: cleanName,
          district: detectedDistrict,
          category,
          coordinates: [lat, lon],
          avg_time_spent: 90,
          senior_friendly: isSeniorFriendly,
          kid_friendly: true,
          opening_hours: { open, close },
          approx_cost: 50,
          description:
            extratags.description ||
            `Authentic discovery located in ${detectedDistrict}, Kerala verified on OpenStreetMap.`,
          highlights: [
            extratags.tourism || 'Tourist Attraction',
            detectedDistrict,
            'OSM Verified',
          ],
          image: getCategoryDefaultImage(category[0]),
          weatherRegion: getWeatherRegionForDistrict(detectedDistrict),
          isCustom: false,
        };

        return place;
      });

    osmCache.set(cacheKey, places);
    return places;
  } catch (err) {
    console.warn('OSM Nominatim fetch error:', err);
    return [];
  }
}

/**
 * Fetch rich details from OpenStreetMap and Wikipedia for a given place
 */
export async function fetchPlaceDossier(
  placeName: string,
  district: string,
  coords: [number, number]
): Promise<OSMEnrichedDetails> {
  const cacheKey = `dossier_${placeName}_${district}`;
  if (osmCache.has(cacheKey)) {
    return osmCache.get(cacheKey);
  }

  const result: OSMEnrichedDetails = {
    osmId: `osm_${Date.now()}`,
    name: placeName,
    district,
    category: 'Sightseeing',
    address: `${placeName}, ${district}, Kerala, India`,
    coordinates: coords,
  };

  // 1. Try querying Wikipedia REST API for place summary & thumbnail
  try {
    const wikiSearchQuery = placeName.replace(/Kerala|India/gi, '').trim();
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      wikiSearchQuery
    )}`;
    
    const wikiRes = await fetch(wikiUrl);
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      if (wikiData.extract && !wikiData.extract.includes('may refer to:')) {
        result.wikipediaTitle = wikiData.title;
        result.wikipediaExtract = wikiData.extract;
        if (wikiData.thumbnail?.source) {
          result.wikipediaThumbnail = wikiData.thumbnail.source;
        }
      }
    }
  } catch (e) {
    console.debug('Wikipedia summary not found for:', placeName);
  }

  // 2. Reverse lookup in OpenStreetMap to get exact address tags & extratags
  try {
    const [lat, lon] = coords;
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&extratags=1`;
    const osmRes = await fetch(reverseUrl);
    if (osmRes.ok) {
      const osmData = await osmRes.json();
      if (osmData.extratags) {
        if (osmData.extratags.opening_hours) {
          result.openingHours = osmData.extratags.opening_hours;
        }
        if (osmData.extratags.website) {
          result.website = osmData.extratags.website;
        }
        if (osmData.extratags.phone) {
          result.phone = osmData.extratags.phone;
        }
        if (osmData.extratags.wheelchair) {
          result.wheelchair = osmData.extratags.wheelchair;
        }
        if (osmData.extratags.tourism) {
          result.tourismType = osmData.extratags.tourism;
        }
        if (osmData.extratags.historic) {
          result.historicType = osmData.extratags.historic;
        }
      }
      if (osmData.display_name) {
        result.address = osmData.display_name;
      }
    }
  } catch (e) {
    console.debug('OSM reverse geocoding skipped');
  }

  osmCache.set(cacheKey, result);
  return result;
}

// Helpers
function identifyDistrict(address: any, displayName: string): District {
  const text = (
    (address.state_district || '') +
    ' ' +
    (address.county || '') +
    ' ' +
    displayName
  ).toLowerCase();

  for (const d of KERALA_DISTRICTS) {
    if (text.includes(d.toLowerCase())) {
      return d;
    }
  }

  // Fallback defaults
  if (text.includes('ernakulam') || text.includes('cochin') || text.includes('kochi')) return 'Ernakulam';
  if (text.includes('trivandrum') || text.includes('kovalam')) return 'Thiruvananthapuram';
  if (text.includes('munnar')) return 'Idukki';
  if (text.includes('alleppey')) return 'Alappuzha';
  if (text.includes('calicut')) return 'Kozhikode';

  return 'Ernakulam';
}

function classifyCategory(type: string, cls: string, extratags: any, name: string): Category[] {
  const text = (type + ' ' + cls + ' ' + (extratags.tourism || '') + ' ' + name).toLowerCase();

  if (text.includes('beach') || text.includes('coast')) return ['Beach'];
  if (text.includes('backwater') || text.includes('lake') || text.includes('boat') || text.includes('canal')) return ['Backwaters'];
  if (text.includes('waterfall') || text.includes('falls')) return ['Waterfall'];
  if (text.includes('mountain') || text.includes('peak') || text.includes('hill') || text.includes('viewpoint')) return ['Mountain'];
  if (text.includes('wildlife') || text.includes('sanctuary') || text.includes('national_park') || text.includes('zoo')) return ['Wildlife'];
  if (text.includes('historic') || text.includes('fort') || text.includes('palace') || text.includes('museum') || text.includes('temple')) return ['Historic'];
  if (text.includes('tea') || text.includes('coffee') || text.includes('plantation') || text.includes('spice')) return ['Plantation'];
  if (text.includes('food') || text.includes('restaurant') || text.includes('market')) return ['Culinary'];

  return ['Culture'];
}

function getWeatherRegionForDistrict(district: string): WeatherRegion {
  if (district === 'Idukki' || district === 'Wayanad') return 'Highlands';
  if (district === 'Alappuzha' || district === 'Kottayam') return 'Backwaters';
  if (district === 'Thiruvananthapuram' || district === 'Kollam') return 'Coast';
  if (district === 'Kozhikode' || district === 'Kannur' || district === 'Kasaragod') return 'Malabar Hills';
  return 'Central Plains';
}

function getCategoryDefaultImage(cat: string): string {
  switch (cat) {
    case 'Beach':
      return 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80';
    case 'Backwaters':
      return 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80';
    case 'Mountain':
      return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80';
    case 'Waterfall':
      return 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=800&auto=format&fit=crop&q=80';
    case 'Wildlife':
      return 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800&auto=format&fit=crop&q=80';
    case 'Plantation':
      return 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800&auto=format&fit=crop&q=80';
    case 'Historic':
    default:
      return 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=800&auto=format&fit=crop&q=80';
  }
}
