const express = require('express');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cors = require('cors');
const AdmZip = require('adm-zip'); // For unzipping the static file

const app = express();
const port = 3000;

const GTFS_REALTIME_URL = 'https://gtfs.halifax.ca/realtime/Vehicle/VehiclePositions.pb';
const GTFS_STATIC_URL = 'https://gtfs.halifax.ca/static/google_transit.zip';

app.use(cors());

// --- GLOBAL STORAGE ---
// The server remembers this data forever (until restart)
let cache = {
    buses: [],          // The real-time bus locations
    routes: {},         // The static route info (e.g. "90": "Larry Uteck")
    staleCount: 0,      // Counts how many times real-time data was identical
    lastDataString: ""  // String version of real-time data for comparison
};

// --- WORKER 1: STATIC DATA (Runs once on startup, then every 24 hours) ---
// This downloads the big zip file, finds routes.txt, and parses it for names
async function updateStaticData() {
    try {
        console.log("Downloading Static GTFS Data (routes.txt)...");
        const response = await fetch(GTFS_STATIC_URL);
        if (!response.ok) throw new Error("Failed to download static zip");

        const buffer = await response.arrayBuffer();
        const zip = new AdmZip(Buffer.from(buffer));
        const routeText = zip.readAsText("routes.txt");

        const lines = routeText.split('\n');
        
        // 1. Safe Header Parsing 
        // Removes hidden BOM characters (ufeff) and quotes to ensure we find columns correctly
        const headers = lines[0].split(',').map(h => h.trim().replace(/^[\ufeff]+/, '').replace(/['"]+/g, ''));
        
        // Find correct column indexes
        const idIndex = headers.indexOf('route_id');
        const nameIndex = headers.indexOf('route_long_name');
        const typeIndex = headers.indexOf('route_type'); 

        let newRoutes = {};

        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i];
            if (!currentLine) continue;

            // Simple CSV split that respects quotes (standard GTFS format)
            const parts = currentLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            
            if (parts[idIndex] && parts[nameIndex]) {
                const routeId = parts[idIndex].replace(/"/g, '').trim();
                const routeName = parts[nameIndex].replace(/"/g, '').trim();
                
                // 2. FIX: Remove quotes from routeType before checking!
                const routeType = parts[typeIndex] ? parts[typeIndex].replace(/"/g, '').trim() : "3"; 

                // FILTER: 
                // GTFS Route Types: 3 = Bus, 4 = Ferry.
                // If it is NOT a bus (3), skip it.
                if (routeType !== "3") {
                    continue; 
                }

                newRoutes[routeId] = routeName;
            }
        }

        cache.routes = newRoutes;
        console.log(`Loaded ${Object.keys(newRoutes).length} bus routes (Ferries excluded).`);

    } catch (error) {
        console.error("Static Data Error:", error.message);
    }
}

// --- WORKER 2: REAL-TIME DATA (Runs every 15 seconds) ---
async function updateRealtimeData() {
    try {
        // console.log("Fetching fresh data from Halifax Transit...");
        const response = await fetch(GTFS_REALTIME_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });

        if (!response.ok) throw new Error(`External Server Error: ${response.status}`);

        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

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

        // Stale Detection Logic
        const currentDataString = JSON.stringify(buses);
        if (currentDataString === cache.lastDataString && buses.length > 0) {
            cache.staleCount++;
            // console.log(`Data is stale. Count: ${cache.staleCount}`);
        } else {
            cache.staleCount = 0;
            cache.buses = buses;
            cache.lastDataString = currentDataString;
            // console.log("New data received!");
        }

    } catch (error) {
        console.error("Realtime Fetch failed:", error.message);
        cache.staleCount++;
    }
}

// Start Workers
updateStaticData(); // Run once immediately
setInterval(updateStaticData, 86400000); // Run every 24 hours (86400000 ms)

updateRealtimeData(); // Run once immediately
setInterval(updateRealtimeData, 15000); // Run every 15 seconds

// --- ENDPOINTS ---

// 1. Get Buses (Real-time)
app.get('/buses', (req, res) => {
    // Send the Stale Count as a hidden header
    res.set('X-Stale-Count', cache.staleCount);
    // Send the data from memory (Instant response)
    res.json(cache.buses);
});

// 2. Get Route List (Static)
app.get('/routes', (req, res) => {
    res.json(cache.routes);
});

app.listen(port, () => {
    console.log(`Bus tracker backend running at http://localhost:${port}`);
});