const express = require('express');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = 3000;

// Halifax Transit Real-Time URL
const GTFS_URL = 'https://gtfs.halifax.ca/realtime/Vehicle/VehiclePositions.pb';

// CACHING SETUP
// We will store the data here and only update it if 15 seconds have passed.
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15000; // 15 seconds in milliseconds

// ALLOW CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

// Function to fetch data from Halifax
async function fetchFromHalifax() {
    const now = Date.now();
    
    // 1. Check Cache
    if (cachedData && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedData;
    }

    console.log("Fetching fresh data from Halifax Transit...");
    
    // 2. Fetch WITHOUT the strict 'Accept' header
    // We only keep User-Agent to be polite, but we make it look like a standard browser.
    const response = await fetch(GTFS_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' 
        }
    });

    if (!response.ok) {
        // This will print the exact error code if it fails again
        throw new Error(`External Server Error: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    
    // 3. Decode
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

    // 4. Process
    const buses = feed.entity.map(entity => {
        if (entity.vehicle) {
            return {
                id: entity.id,
                routeId: entity.vehicle.trip ? entity.vehicle.trip.routeId : 'Unknown',
                latitude: entity.vehicle.position.latitude,
                longitude: entity.vehicle.position.longitude,
                bearing: entity.vehicle.position.bearing,
                speed: entity.vehicle.position.speed
            };
        }
    }).filter(bus => bus);

    // 5. Save to cache
    cachedData = buses;
    lastFetchTime = now;
    return buses;
}

app.get('/buses', async (req, res) => {
    try {
        const buses = await fetchFromHalifax();
        res.json(buses);
    } catch (error) {
        console.error("Fetch failed:", error.message);
        // If fetch fails, try to send old cached data if we have it
        if (cachedData) {
            console.log("Serving cached data instead.");
            res.json(cachedData);
        } else {
            res.status(500).json({ error: 'Failed to fetch bus data' });
        }
    }
});

app.listen(port, () => {
    console.log(`Bus tracker backend running at http://localhost:${port}`);
});