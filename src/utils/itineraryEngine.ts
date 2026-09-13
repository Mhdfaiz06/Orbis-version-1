import {
  Place,
  UserPreferences,
  DayPlan,
  ItineraryStop,
  ConflictAlert,
  Badge,
  TravelStyle,
  Traveler,
} from '../types/kerala';
import { START_HUBS, KERALA_PLACES } from '../data/keralaPlaces';
import {
  calculateHaversineDistance,
  estimateKeralaDrivingDistanceAndMinutes,
  minutesToTimeString,
  timeStringToMinutes,
  formatDuration,
} from './geoRouting';

const HOTEL_SUGGESTIONS_BY_DISTRICT: Record<
  string,
  { name: string; area: string; pricePerNight: number; rating: number }
> = {
  Ernakulam: {
    name: 'Brunton Boatyard / Grand Hyatt Kochi',
    area: 'Fort Kochi / Bolgatty Waterfront',
    pricePerNight: 4200,
    rating: 4.8,
  },
  Idukki: {
    name: 'Windermere Estate / Blanket Luxury Resort',
    area: 'Munnar Tea Valley / Pallivasal',
    pricePerNight: 4800,
    rating: 4.9,
  },
  Alappuzha: {
    name: 'Lake Palace Resort / Punnamada Backwaters',
    area: 'Vembanad Lake Edge, Alleppey',
    pricePerNight: 4500,
    rating: 4.7,
  },
  Kottayam: {
    name: 'Kumarakom Lake Resort',
    area: 'Kumarakom Backwater Shore',
    pricePerNight: 5200,
    rating: 4.9,
  },
  Thiruvananthapuram: {
    name: 'The Leela Kovalam / Gateway Varkala',
    area: 'Kovalam Beach Cliff',
    pricePerNight: 5500,
    rating: 4.8,
  },
  Kollam: {
    name: 'The Raviz Ashtamudi',
    area: 'Ashtamudi Lake Bank, Kollam',
    pricePerNight: 4100,
    rating: 4.7,
  },
  Thrissur: {
    name: 'Rainforest Resort Athirappilly',
    area: 'Chalakudy River Forest, Athirappilly',
    pricePerNight: 3900,
    rating: 4.8,
  },
  Wayanad: {
    name: 'Vythiri Resort / Pepper Trail',
    area: 'Lakkidi Rain Canopy, Wayanad',
    pricePerNight: 4600,
    rating: 4.8,
  },
  Kozhikode: {
    name: 'The Gateway Hotel Beach Road',
    area: 'Calicut Heritage Beach Walk',
    pricePerNight: 3600,
    rating: 4.6,
  },
  Kannur: {
    name: 'Krishna Beach Resort & Spa',
    area: 'Kannur Coastal Shore',
    pricePerNight: 3200,
    rating: 4.5,
  },
  Kasaragod: {
    name: 'The Lalit Resort & Spa Bekal',
    area: 'Bekal Beach & Lagoon',
    pricePerNight: 5800,
    rating: 4.9,
  },
  default: {
    name: 'Kerala Traditional Heritage Homestay',
    area: 'Central Serene Quarter',
    pricePerNight: 2800,
    rating: 4.6,
  },
};

/**
 * Returns style-based schedule constants
 */
export function getStyleScheduleConfig(style: TravelStyle) {
  switch (style) {
    case 'relaxed':
      return {
        placesPerDay: 2,
        startMinutes: 10 * 60, // 10:00 AM
        bufferMinutes: 60,
        dayEndTarget: 19 * 60, // 07:00 PM
      };
    case 'packed':
      return {
        placesPerDay: 4,
        startMinutes: 7 * 60 + 30, // 07:30 AM
        bufferMinutes: 15,
        dayEndTarget: 21 * 60 + 30, // 09:30 PM
      };
    case 'normal':
    default:
      return {
        placesPerDay: 3,
        startMinutes: 9 * 60, // 09:00 AM
        bufferMinutes: 30,
        dayEndTarget: 20 * 60, // 08:00 PM
      };
  }
}

/**
 * Validates conflicts for a specific stop given its arrival and departure times
 */
export function evaluateStopConflicts(
  stop: {
    place: Place;
    arrivalMinutes: number;
    departureMinutes: number;
    travelToNextMinutes?: number;
  },
  travelers: Traveler[]
): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];
  const { place, arrivalMinutes, departureMinutes, travelToNextMinutes } = stop;

  const openMinutes = timeStringToMinutes(place.opening_hours.open);
  const closeMinutes = timeStringToMinutes(place.opening_hours.close);

  // 1. Check opening hours
  if (arrivalMinutes < openMinutes) {
    alerts.push({
      type: 'late_arrival',
      severity: 'warning',
      message: `Arriving before opening (${place.opening_hours.open}). Gate may be closed.`,
    });
  }

  if (arrivalMinutes >= closeMinutes) {
    alerts.push({
      type: 'closed',
      severity: 'danger',
      message: `Critical: Arriving at ${minutesToTimeString(arrivalMinutes)}, but ${place.name} closes at ${place.opening_hours.close}!`,
    });
  } else if (departureMinutes > closeMinutes) {
    alerts.push({
      type: 'closed',
      severity: 'warning',
      message: `Closing conflict: Closes at ${place.opening_hours.close} before planned departure at ${minutesToTimeString(departureMinutes)}.`,
    });
  }

  // 2. Check senior traveler constraints
  const hasSenior = travelers.some((t) => t.age >= 60);
  if (hasSenior) {
    if (!place.senior_friendly) {
      alerts.push({
        type: 'senior_warning',
        severity: 'warning',
        message: `Senior Notice: Contains steep steps or rough paths. Moderate pace advised.`,
      });
    }
    if (place.category.includes('Trekking')) {
      alerts.push({
        type: 'senior_warning',
        severity: 'warning',
        message: `Trekking terrain: High elevation / physical exertion required.`,
      });
    }
  }

  // 3. Excessive drive warning
  if (travelToNextMinutes && travelToNextMinutes > 150) {
    alerts.push({
      type: 'excessive_drive',
      severity: 'warning',
      message: `Long stretch: ${formatDuration(travelToNextMinutes)} drive to next stop. Plan a tea/coconut break!`,
    });
  }

  return alerts;
}

/**
 * Re-computes time slots, travel times to next stop, and conflicts for a list of stops in a day
 */
export function recalculateDayStops(
  stops: ItineraryStop[],
  dayNumber: number,
  style: TravelStyle,
  travelers: Traveler[]
): ItineraryStop[] {
  const config = getStyleScheduleConfig(style);
  let currentMinutes = config.startMinutes;

  return stops.map((stop, index) => {
    const isLast = index === stops.length - 1;
    const duration = Math.max(30, stop.allocatedDuration || stop.place.avg_time_spent || 90);

    const arrivalMinutes = currentMinutes;
    const departureMinutes = arrivalMinutes + duration;

    let travelTimeToNextMinutes = 0;
    let travelDistanceToNextKm = 0;

    if (!isLast) {
      const nextStop = stops[index + 1];
      const drive = estimateKeralaDrivingDistanceAndMinutes(
        stop.place.coordinates,
        nextStop.place.coordinates,
        stop.place.district,
        nextStop.place.district
      );
      travelTimeToNextMinutes = drive.durationMinutes;
      travelDistanceToNextKm = drive.distanceKm;

      // advance clock for next stop: departure + drive + buffer
      currentMinutes = departureMinutes + travelTimeToNextMinutes + config.bufferMinutes;
    } else {
      currentMinutes = departureMinutes;
    }

    const conflicts = evaluateStopConflicts(
      {
        place: stop.place,
        arrivalMinutes,
        departureMinutes,
        travelToNextMinutes: travelTimeToNextMinutes,
      },
      travelers
    );

    return {
      ...stop,
      day: dayNumber,
      scheduledStartTime: minutesToTimeString(arrivalMinutes, false),
      scheduledEndTime: minutesToTimeString(departureMinutes, false),
      allocatedDuration: duration,
      travelTimeToNextMinutes,
      travelDistanceToNextKm,
      conflicts,
    };
  });
}

/**
 * Main Itinerary Generation Engine
 */
export function generateKeralaItinerary(
  preferences: UserPreferences,
  placesDB: Place[] = KERALA_PLACES
): DayPlan[] {
  const {
    travelers,
    style,
    categories,
    days,
    startHubId,
    mustVisitPlaceIds,
  } = preferences;

  const config = getStyleScheduleConfig(style);
  const startHub =
    START_HUBS.find((h) => h.id === startHubId) || START_HUBS[0];

  const hasSenior = travelers.some((t) => t.age >= 60);

  // 1. Separate must-visit places
  const mustVisitPlaces = placesDB.filter((p) =>
    mustVisitPlaceIds.includes(p.id)
  );

  // 2. Filter available places matching preferences
  const candidatePlaces = placesDB.filter((p) => {
    // If must-visit, it is handled
    if (mustVisitPlaceIds.includes(p.id)) return false;

    // Category match
    const matchesCategory =
      categories.length === 0 ||
      p.category.some((c) => categories.includes(c));

    if (!matchesCategory) return false;

    // If senior traveler, favor senior friendly
    if (hasSenior && !p.senior_friendly && p.category.includes('Trekking')) {
      return false; // exclude harsh treks by default
    }

    return true;
  });

  const dayPlans: DayPlan[] = [];
  const usedPlaceIds = new Set<string>();

  // Current anchor coordinates for clustering
  let currentCoordinates: [number, number] = startHub.coordinates;
  let currentDistrict: string = startHub.district;

  // Remaining must visits queue
  const remainingMustVisits = [...mustVisitPlaces];

  for (let d = 1; d <= days; d++) {
    const dayStops: Place[] = [];
    const targetCount = config.placesPerDay;

    // Check if there is a must visit place closest to our current location
    if (remainingMustVisits.length > 0) {
      // Pick the closest remaining must visit
      remainingMustVisits.sort(
        (a, b) =>
          calculateHaversineDistance(currentCoordinates, a.coordinates) -
          calculateHaversineDistance(currentCoordinates, b.coordinates)
      );
      const mustPlace = remainingMustVisits.shift()!;
      dayStops.push(mustPlace);
      usedPlaceIds.add(mustPlace.id);
      currentCoordinates = mustPlace.coordinates;
      currentDistrict = mustPlace.district;
    }

    // Fill the remainder of the day using Geographic Clustering (nearest neighbors)
    while (dayStops.length < targetCount) {
      // Find candidate place closest to currentCoordinates and not yet used
      const available = candidatePlaces.filter((p) => !usedPlaceIds.has(p.id));
      if (available.length === 0) break;

      // Sort by proximity to current coordinates, giving extra weight to same district
      available.sort((a, b) => {
        const distA = calculateHaversineDistance(currentCoordinates, a.coordinates);
        const distB = calculateHaversineDistance(currentCoordinates, b.coordinates);

        const districtBonusA = a.district === currentDistrict ? -25 : 0;
        const districtBonusB = b.district === currentDistrict ? -25 : 0;

        return distA + districtBonusA - (distB + districtBonusB);
      });

      const nextPlace = available[0];
      dayStops.push(nextPlace);
      usedPlaceIds.add(nextPlace.id);
      currentCoordinates = nextPlace.coordinates;
      currentDistrict = nextPlace.district;
    }

    // Convert Places to ItineraryStops with unique IDs
    const initialStops: ItineraryStop[] = dayStops.map((place, idx) => ({
      id: `stop_${d}_${idx}_${place.id}`,
      placeId: place.id,
      place,
      day: d,
      scheduledStartTime: '09:00',
      scheduledEndTime: '11:00',
      allocatedDuration: place.avg_time_spent || 90,
      travelTimeToNextMinutes: 0,
      travelDistanceToNextKm: 0,
      conflicts: [],
    }));

    // Calculate precise schedule, travel times, and conflict checks
    const computedStops = recalculateDayStops(initialStops, d, style, travelers);

    const totalDrive = computedStops.reduce((sum, s) => sum + s.travelTimeToNextMinutes, 0);
    const totalDist = computedStops.reduce((sum, s) => sum + s.travelDistanceToNextKm, 0);

    const districts = Array.from(new Set(computedStops.map((s) => s.place.district)));
    const primaryDistrict = districts[0] || startHub.district;

    const hotel =
      HOTEL_SUGGESTIONS_BY_DISTRICT[primaryDistrict] ||
      HOTEL_SUGGESTIONS_BY_DISTRICT.default;

    // Thematic titles based on day's primary district / categories
    const dayTheme = getDayTheme(computedStops, d);

    dayPlans.push({
      day: d,
      title: `Day ${d}: ${districts.join(' & ')} Trail`,
      theme: dayTheme,
      stops: computedStops,
      totalDriveMinutes: totalDrive,
      totalDistanceKm: Math.round(totalDist * 10) / 10,
      districtsVisited: districts,
      hotelSuggestion: hotel,
    });
  }

  return dayPlans;
}

function getDayTheme(stops: ItineraryStop[], dayNum: number): string {
  if (stops.length === 0) return 'Leisure & Exploration';
  const categories = stops.flatMap((s) => s.place.category);
  if (categories.includes('Backwaters')) return 'Tranquil Lagoons & Canal Gliding';
  if (categories.includes('Mountain') || categories.includes('Plantation'))
    return 'Mist-Clad Tea Ridges & Highlands';
  if (categories.includes('Wildlife')) return 'Untamed Jungle Habitats & Safaris';
  if (categories.includes('Beach')) return 'Arabian Sea Shorelines & Sunsets';
  if (categories.includes('Historic') || categories.includes('Culture'))
    return 'Malabar Heritage & Colonial Forts';
  return `Kerala Gateway Discovery - Stage ${dayNum}`;
}

/**
 * Calculates game metrics: Total KMs, Budget estimation, badges unlocked
 */
export function calculateGameMetrics(
  dayPlans: DayPlan[],
  preferences: UserPreferences
): {
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
} {
  const travelersCount = Math.max(1, preferences.travelers.length);
  const budgetMultiplier =
    preferences.budgetLevel === 'luxury'
      ? 1.8
      : preferences.budgetLevel === 'budget'
      ? 0.7
      : 1.0;

  let totalKm = 0;
  let totalDriveMin = 0;
  let totalStops = 0;
  let entryFeesTotal = 0;
  let hotelStayTotal = 0;

  const allStops = dayPlans.flatMap((d) => d.stops);
  const allCategories = new Set(allStops.flatMap((s) => s.place.category));
  const allDistricts = new Set(allStops.map((s) => s.place.district));

  dayPlans.forEach((day) => {
    totalKm += day.totalDistanceKm;
    totalDriveMin += day.totalDriveMinutes;
    totalStops += day.stops.length;
    hotelStayTotal += day.hotelSuggestion.pricePerNight * budgetMultiplier;

    day.stops.forEach((stop) => {
      entryFeesTotal += (stop.place.approx_cost || 0) * travelersCount;
    });
  });

  // Transport estimate (taxi / private car with fuel in Kerala approx ₹14/km + daily driver allowance)
  const transportCost = Math.round(
    (totalKm * 15 + dayPlans.length * 900) * (preferences.budgetLevel === 'luxury' ? 1.4 : 1.0)
  );

  // Food estimate: ~₹600/day/person for standard, ₹350 budget, ₹1200 luxury
  const foodPerPersonDay =
    preferences.budgetLevel === 'luxury' ? 1400 : preferences.budgetLevel === 'budget' ? 450 : 750;
  const foodEstimate = dayPlans.length * travelersCount * foodPerPersonDay;

  const totalCost = transportCost + entryFeesTotal + hotelStayTotal + foodEstimate;

  // Badges logic
  const badges: Badge[] = [
    {
      id: 'badge_kerala_voyager',
      title: 'Kerala Trailblazer',
      description: 'Planned a multi-day expedition with at least 5 unique discoveries.',
      iconName: 'Compass',
      unlocked: totalStops >= 5,
      progressText: `${Math.min(totalStops, 5)}/5 stops visited`,
    },
    {
      id: 'badge_ghat_master',
      title: 'Ghat Master',
      description: 'Explored high altitude tea slopes & national parks in Idukki or Wayanad.',
      iconName: 'Mountain',
      unlocked: allDistricts.has('Idukki') || allDistricts.has('Wayanad'),
      progressText:
        allDistricts.has('Idukki') || allDistricts.has('Wayanad')
          ? 'Western Ghats conquered'
          : 'Include Munnar or Wayanad',
    },
    {
      id: 'badge_backwater_nomad',
      title: 'Backwater Nomad',
      description: 'Scheduled serene canal cruising in Alleppey or Kumarakom lagoons.',
      iconName: 'Anchor',
      unlocked: allCategories.has('Backwaters'),
      progressText: allCategories.has('Backwaters') ? 'Cruising unlocked' : 'Add Alleppey or Munroe',
    },
    {
      id: 'badge_malabar_spice',
      title: 'Malabar Spice Connoisseur',
      description: 'Included iconic Malabar culinary trails or heritage colonial ports.',
      iconName: 'Utensils',
      unlocked: allCategories.has('Culinary') || allDistricts.has('Kozhikode'),
      progressText:
        allCategories.has('Culinary') || allDistricts.has('Kozhikode')
          ? 'Taste of Kerala unlocked'
          : 'Include Calicut SM Street or culinary stop',
    },
    {
      id: 'badge_north_south',
      title: 'North-South Odyssey',
      description: 'Covered over 250 km connecting multiple geographical zones of Kerala.',
      iconName: 'Award',
      unlocked: totalKm >= 250,
      progressText: `${Math.round(totalKm)}/250 km mapped`,
    },
    {
      id: 'badge_senior_champion',
      title: 'Gentle Travel Champion',
      description: 'Curated a senior-safe trip with zero harsh physical conflicts.',
      iconName: 'ShieldCheck',
      unlocked: allStops.every((s) => s.conflicts.filter((c) => c.severity === 'danger').length === 0),
      progressText: 'Paced schedule without closing-time clashes',
    },
  ];

  // Score calculation (0 to 100)
  const score = Math.min(
    100,
    Math.round(
      badges.filter((b) => b.unlocked).length * 15 +
        Math.min(totalStops * 4, 30) +
        Math.min(allDistricts.size * 5, 20)
    )
  );

  return {
    totalKm: Math.round(totalKm * 10) / 10,
    totalDriveHours: formatDuration(totalDriveMin),
    totalStops,
    costBreakdown: {
      transport: transportCost,
      entryFees: entryFeesTotal,
      hotelStay: Math.round(hotelStayTotal),
      foodEstimate,
      total: totalCost,
    },
    badges,
    explorationScore: score,
  };
}
