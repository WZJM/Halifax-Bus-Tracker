const express = require('express');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cors = require('cors'); // Ensure you have this installed

const app = express();
const port = 3000;

// Halifax Transit Real-Time URL
const GTFS_URL = 'https://gtfs.halifax.ca/realtime/Vehicle/VehiclePositions.pb';

// ALLOW CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Expose-Headers", "X-Stale-Count"); // ALLOW FRONTEND TO SEE THE HEADER
    next();
});

// --- GLOBAL STORAGE ---
// The server remembers this data forever (until restart)
let cache = {
    data: [],           // The list of buses
    staleCount: 0,      // How many times data was identical
    lastDataString: ""  // String version of data for comparison
};

// --- THE BACKGROUND WORKER ---
// This runs automatically every 15 seconds
async function updateHalifaxData() {
    try {
        // console.log("Fetching fresh data from Halifax Transit...");
        
        const response = await fetch(GTFS_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });

        if (!response.ok) {
            throw new Error(`External Server Error: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

        // Process the data exactly like you did before
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

        // --- STALE DETECTION LOGIC ---
        // Convert the new list of buses to a string to compare with the old list
        const currentDataString = JSON.stringify(buses);

        if (currentDataString === cache.lastDataString && buses.length > 0) {
            // Data is exactly the same as last time
            cache.staleCount++;
            console.log(`Data is stale. Count: ${cache.staleCount}`);
        } else {
            // Data has moved! Reset counter
            cache.staleCount = 0;
            cache.data = buses;
            cache.lastDataString = currentDataString;
            console.log("New data received!");
        }

    } catch (error) {
        console.error("Fetch failed:", error.message);
        // If fetch fails, we assume data is getting stale (or just broken)
        cache.staleCount++;
    }
}

// 1. Start the loop immediately
updateHalifaxData();

// 2. Schedule it to run every 15 seconds forever
setInterval(updateHalifaxData, 15000);

// --- THE ENDPOINT ---
app.get('/buses', (req, res) => {
    // 1. Send the Stale Count as a hidden header
    // This allows us to keep the JSON body as a simple Array (which your frontend expects)
    res.set('X-Stale-Count', cache.staleCount);
    
    // 2. Send the data instantly from memory
    res.json(cache.data);
});

app.listen(port, () => {
    console.log(`Bus tracker backend running at http://localhost:${port}`);
});