export type Category =
  | 'Mountain'
  | 'Wildlife'
  | 'Trekking'
  | 'Beach'
  | 'Backwaters'
  | 'Historic'
  | 'Religious'
  | 'Culinary'
  | 'Culture'
  | 'Waterfall'
  | 'Plantation';

export type District =
  | 'Thiruvananthapuram'
  | 'Kollam'
  | 'Pathanamthitta'
  | 'Alappuzha'
  | 'Kottayam'
  | 'Idukki'
  | 'Ernakulam'
  | 'Thrissur'
  | 'Palakkad'
  | 'Malappuram'
  | 'Kozhikode'
  | 'Wayanad'
  | 'Kannur'
  | 'Kasaragod';

export type WeatherRegion = 'Highlands' | 'Backwaters' | 'Coast' | 'Malabar Hills' | 'Central Plains';

export interface Place {
  id: string;
  name: string;
  district: District;
  category: Category[];
  coordinates: [number, number]; // [lat, lng]
  avg_time_spent: number; // in minutes
  senior_friendly: boolean;
  kid_friendly: boolean;
  opening_hours: {
    open: string;  // e.g. "07:30"
    close: string; // e.g. "17:30"
  };
  approx_cost: number; // entry fee / standard cost in INR per person
  description: string;
  highlights: string[];
  image: string;
  weatherRegion: WeatherRegion;
  elevation?: number; // meters above sea level
  recommendedSeason?: string;
  isCustom?: boolean;
  isFoodSpot?: boolean;
  isLunchSpot?: boolean;
  isMountain?: boolean;
  foodSpecialty?: string;
}

export interface Traveler {
  id: string;
  name: string;
  age: number;
}

export type TravelStyle = 'relaxed' | 'normal' | 'packed';

export interface UserPreferences {
  travelers: Traveler[];
  style: TravelStyle;
  categories: Category[];
  days: number;
  startHubId: string;
  mustVisitPlaceIds: string[];
  budgetLevel: 'budget' | 'standard' | 'luxury';
}

export interface ConflictAlert {
  type: 'closed' | 'late_arrival' | 'senior_warning' | 'excessive_drive' | 'monsoon_alert';
  message: string;
  severity: 'warning' | 'danger' | 'info';
}

export interface ItineraryStop {
  id: string; // unique stop instance id
  placeId: string;
  place: Place;
  day: number;
  scheduledStartTime: string; // "09:00"
  scheduledEndTime: string;   // "11:30"
  allocatedDuration: number;  // in minutes
  travelTimeToNextMinutes: number; // travel time to next stop in day
  travelDistanceToNextKm: number;
  conflicts: ConflictAlert[];
  isFoodBreak?: boolean;
  mealType?: 'lunch' | 'dinner' | 'breakfast' | 'tea_snack';
  curationReason?: string;
}

export interface DayPlan {
  day: number;
  title: string;
  theme: string;
  stops: ItineraryStop[];
  totalDriveMinutes: number;
  totalDistanceKm: number;
  districtsVisited: District[];
  hotelSuggestion: {
    name: string;
    area: string;
    pricePerNight: number;
    rating: number;
  };
  lunchSpotSuggestion?: {
    name: string;
    specialty: string;
    district: string;
    estimatedMinutes?: number;
    recommendation?: string;
  };
  curatedSummary?: string;
  proTips?: string[];
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlocked: boolean;
  progressText: string;
}

export interface RegionalWeather {
  region: WeatherRegion;
  name: string;
  tempC: number;
  condition: string;
  humidity: number;
  rainChance: number;
  monsoonStatus: 'Safe' | 'Moderate Showers' | 'Heavy Ghat Rains' | 'Sunny Tropical';
  alert?: string;
}
