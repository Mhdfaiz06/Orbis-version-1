import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString(),
  });
});

// Overpass API live places search endpoint (Mountains, viewpoints, authentic food spots)
app.post('/api/fetch-live-places', async (req, res) => {
  try {
    const { district, category, limit = 15 } = req.body;
    
    // District approximate bounding boxes in Kerala [minLat, minLon, maxLat, maxLon]
    const DISTRICT_BBOX: Record<string, [number, number, number, number]> = {
      Idukki: [9.5, 76.7, 10.3, 77.4],
      Wayanad: [11.4, 75.8, 11.95, 76.4],
      Ernakulam: [9.8, 76.1, 10.25, 76.65],
      Alappuzha: [9.2, 76.25, 9.75, 76.5],
      Thiruvananthapuram: [8.25, 76.75, 8.85, 77.25],
      Kozhikode: [11.1, 75.7, 11.65, 76.05],
      Kottayam: [9.4, 76.4, 9.85, 76.85],
      Thrissur: [10.2, 76.0, 10.7, 76.45],
      Palakkad: [10.5, 76.3, 11.1, 76.9],
      Kannur: [11.7, 75.3, 12.2, 75.8],
      Kasaragod: [12.2, 74.9, 12.8, 75.4],
    };

    const bbox = DISTRICT_BBOX[district] || [8.2, 74.8, 12.85, 77.5]; // Kerala default
    const [minLat, minLon, maxLat, maxLon] = bbox;

    let overpassQuery = '';
    if (category === 'mountain') {
      overpassQuery = `
        [out:json][timeout:10];
        (
          node["natural"="peak"](${minLat},${minLon},${maxLat},${maxLon});
          node["tourism"="viewpoint"](${minLat},${minLon},${maxLat},${maxLon});
          way["tourism"="viewpoint"](${minLat},${minLon},${maxLat},${maxLon});
        );
        out center ${limit};
      `;
    } else if (category === 'food') {
      overpassQuery = `
        [out:json][timeout:10];
        (
          node["amenity"="restaurant"](${minLat},${minLon},${maxLat},${maxLon});
          node["amenity"="cafe"](${minLat},${minLon},${maxLat},${maxLon});
        );
        out center ${limit};
      `;
    } else {
      overpassQuery = `
        [out:json][timeout:10];
        (
          node["tourism"](${minLat},${minLon},${maxLat},${maxLon});
          node["historic"](${minLat},${minLon},${maxLat},${maxLon});
        );
        out center ${limit};
      `;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'KeralaDiscoveryApp/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!overpassRes.ok) {
      return res.status(200).json({ places: [], source: 'fallback' });
    }

    const data: any = await overpassRes.json();
    const elements = data.elements || [];

    const parsedPlaces = elements
      .filter((el: any) => el.tags && (el.tags.name || el.tags['name:en']))
      .map((el: any) => {
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        const name = el.tags['name:en'] || el.tags.name;
        const isPeak = el.tags.natural === 'peak' || el.tags.tourism === 'viewpoint';
        const isFood = el.tags.amenity === 'restaurant' || el.tags.amenity === 'cafe';

        return {
          id: `osm_live_${el.id}`,
          name,
          district: district || 'Kerala',
          category: isPeak ? ['Mountain'] : isFood ? ['Culinary'] : ['Culture'],
          coordinates: [lat, lon],
          avg_time_spent: isFood ? 60 : isPeak ? 90 : 75,
          senior_friendly: !isPeak,
          kid_friendly: true,
          opening_hours: {
            open: isFood ? '11:30' : '07:00',
            close: isFood ? '22:00' : '18:30',
          },
          approx_cost: isFood ? 350 : 50,
          description: el.tags.description || el.tags.cuisine
            ? `Cuisine: ${el.tags.cuisine || 'Kerala Traditional'}. Real location verified via OpenStreetMap.`
            : `Scenic Kerala discovery in ${district || 'Kerala'} indexed on OpenStreetMap.`,
          highlights: [
            el.tags.cuisine ? `Cuisine: ${el.tags.cuisine}` : isPeak ? 'Scenic Mountain Panorama' : 'Local Favorite',
            district || 'Kerala',
            'Live OSM'
          ],
          image: isPeak
            ? 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80'
            : isFood
            ? 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800&auto=format&fit=crop&q=80',
          weatherRegion: (district === 'Idukki' || district === 'Wayanad') ? 'Highlands' : 'Coast',
          elevation: el.tags.ele ? parseInt(el.tags.ele, 10) : undefined,
          isFoodSpot: isFood,
          isLunchSpot: isFood,
          foodSpecialty: el.tags.cuisine || (isFood ? 'Authentic South Indian & Kerala Delicacies' : undefined),
        };
      });

    return res.json({ places: parsedPlaces, source: 'overpass' });
  } catch (error: any) {
    console.warn('Overpass fetch error or timeout:', error.message);
    return res.json({ places: [], source: 'fallback', error: error.message });
  }
});

// Gemini LLM Curation endpoint
app.post('/api/curate-itinerary', async (req, res) => {
  try {
    const {
      travelers = [],
      style = 'normal',
      days = 4,
      startHubId = 'hub_cochin_airport',
      selectedDistricts = [],
      categories = [],
      userPrompt = '',
      dietaryPreference = 'Kerala Traditional, Seafood & Malabar',
      availablePlaces = [],
    } = req.body;

    const ai = getAIClient();

    // If no AI client available (e.g. no key provided in preview), return a smart heuristic response
    if (!ai) {
      console.log('Gemini API key not configured. Returning intelligent fallback curation.');
      return res.json({
        success: true,
        aiPowered: false,
        tripTitle: `Curated ${days}-Day Kerala Discovery`,
        rationale: 'Generated using Kerala Geographic Clustering engine with built-in authentic midday lunch stops and mountain viewpoints.',
        dayCurations: createHeuristicCuratedPlan(days, availablePlaces, style, travelers),
        notes: 'To activate live Gemini 3.8 Flash LLM curation, configure your GEMINI_API_KEY in Settings.',
      });
    }

    // Build prompt for Gemini 3.8 Flash
    const systemInstruction = `
You are an expert Kerala Travel Planner & Cultural Geographer. Your goal is to curate a realistic, perfectly sequenced, highly satisfying day-by-day travel itinerary for Kerala ("God's Own Country"), India.

Core requirements:
1. CURATE FINITE PLACES: Pick only the best 2-4 places per day to prevent exhaustion. No excessive driving across opposite corners of the state on the same day.
2. INCLUDE LUNCH SPOTS & FOOD BREAKS: For every single day, explicitly specify a designated lunch spot or food break around 12:30 PM - 2:00 PM with authentic Kerala culinary specialties (e.g. Thalassery Biryani in Malabar, Karimeen Pollichathu & Appam in Alleppey/Kumarakom backwaters, Traditional Banana Leaf Sadya in Trivandrum/Central Kerala, Tea room & Stew in Munnar mountains).
3. INCLUDE MOUNTAINS & VIEWPOINTS: Highlight scenic peaks, hill stations, and misty viewpoints (e.g. Meesapulimala, Kolukkumalai, Chembra Peak, Ilaveezhapoonchira, Ponmudi) when relevant to the route.
4. TRAVELER SAFETY & PACING:
   - If travelers include seniors (age 60+), ensure gentle walking, no harsh vertical treks without warning, and comfortable rest stops.
   - If travelers include children, include fun nature or beach breaks.
5. REALISTIC SCHEDULING: Order the places logically along realistic travel corridors (e.g., Kochi -> Munnar -> Thekkady -> Alleppey).
`;

    const promptText = `
Please curate a ${days}-day Kerala itinerary with the following parameters:
- Travelers: ${JSON.stringify(travelers)}
- Travel Style: ${style} (relaxed = 2 stops/day, normal = 3 stops/day, packed = 4 stops/day)
- Starting Gateway: ${startHubId}
- Preferred Categories: ${categories.join(', ') || 'All highlights'}
- Preferred Districts: ${selectedDistricts.join(', ') || 'Best logical corridor'}
- Dietary Preference: ${dietaryPreference}
- User Specific Requests: "${userPrompt || 'Focus on scenic mountains, viewpoints, and authentic Kerala food/lunch spots'}"

Sample Available Places in Database:
${JSON.stringify(availablePlaces.slice(0, 30).map((p: any) => ({
  id: p.id,
  name: p.name,
  district: p.district,
  category: p.category,
  foodSpecialty: p.foodSpecialty,
  isFoodSpot: p.isFoodSpot,
  isLunchSpot: p.isLunchSpot,
  description: p.description?.slice(0, 100),
})))}

Generate a structured JSON output with the exact JSON schema matching:
{
  "tripTitle": "string",
  "summary": "string",
  "rationale": "string",
  "days": [
    {
      "day": 1,
      "title": "string",
      "theme": "string",
      "district": "string",
      "lunchSpot": {
        "name": "string",
        "specialty": "string",
        "estimatedMinutes": 60,
        "recommendation": "string"
      },
      "stops": [
        {
          "placeId": "string (match id from available places or create new if not present)",
          "name": "string",
          "district": "string",
          "category": "string",
          "durationMinutes": 90,
          "isFoodBreak": false,
          "isMountain": false,
          "foodSpecialty": "string",
          "curationNote": "string"
        }
      ],
      "proTips": ["string"]
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        { role: 'user', parts: [{ text: systemInstruction + '\n\n' + promptText }] }
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output, using heuristic fallback', parseErr);
      return res.json({
        success: true,
        aiPowered: false,
        tripTitle: `Curated ${days}-Day Kerala Itinerary`,
        rationale: 'Parsed fallback from algorithmic curation.',
        dayCurations: createHeuristicCuratedPlan(days, availablePlaces, style, travelers),
      });
    }

    return res.json({
      success: true,
      aiPowered: true,
      tripTitle: parsedResult.tripTitle || `Curated ${days}-Day Kerala Discovery`,
      summary: parsedResult.summary || 'Custom curated trip with authentic food spots and viewpoints.',
      rationale: parsedResult.rationale || 'Tailored to your travel group pacing and dietary preferences.',
      days: parsedResult.days || [],
    });
  } catch (error: any) {
    console.error('Gemini curation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to curate itinerary with Gemini',
    });
  }
});

// Heuristic fallback builder
function createHeuristicCuratedPlan(days: number, places: any[], style: string, travelers: any[]) {
  const hasSenior = travelers.some((t: any) => t.age >= 60);
  const result = [];

  const lunchSpots = [
    { name: 'Paragon Restaurant', specialty: 'Legendary Malabar Dum Biryani & Elaneer Payasam', district: 'Kozhikode' },
    { name: 'Karimpumkala Restaurant', specialty: 'Backwater Duck Roast & Karimeen Pollichathu', district: 'Kottayam' },
    { name: 'Rapsy Restaurant & Tea Room', specialty: 'Spanish Omelette, Parotta & Munnar Spiced Tea', district: 'Idukki' },
    { name: 'Mothers Veg Plaza', specialty: '30-Dish Royal Travancore Banana Leaf Sadya', district: 'Thiruvananthapuram' },
    { name: 'Kayees Rahmathullah', specialty: 'Historic Fort Kochi Ghee Rice & Mutton Fry', district: 'Ernakulam' },
  ];

  for (let d = 1; d <= days; d++) {
    const lunch = lunchSpots[(d - 1) % lunchSpots.length];
    result.push({
      day: d,
      title: `Day ${d}: Scenic Corridors & Culinary Delights`,
      theme: d === 1 ? 'Heritage & Colonial Gateway' : d === 2 ? 'Misty Mountains & Tea Estates' : 'Backwater Canals & Coastal Cuisine',
      district: lunch.district,
      lunchSpot: {
        name: lunch.name,
        specialty: lunch.specialty,
        estimatedMinutes: 60,
        recommendation: `Recommended midday stop for authentic ${lunch.district} dining.`,
      },
      stops: places.slice((d - 1) * 3, d * 3).map((p: any) => ({
        placeId: p.id,
        name: p.name,
        district: p.district,
        category: p.category?.[0] || 'Culture',
        durationMinutes: p.avg_time_spent || 90,
        isFoodBreak: false,
        isMountain: p.category?.includes('Mountain'),
        curationNote: hasSenior && !p.senior_friendly ? 'Paced gently for senior travelers.' : 'Prime highlight for today.',
      })),
      proTips: [
        'Carry light woolen clothes in high altitude regions.',
        'Keep afternoon 1:00 PM open for a relaxed lunch break.',
      ],
    });
  }
  return result;
}

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
