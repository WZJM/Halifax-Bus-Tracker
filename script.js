// --- 1. LANGUAGE DICTIONARY ---
const translations = {
    en: {
        navTitle: "HRM Bus Tracker",
        welcome: "Thanks for using HRM Bus Tracker!",
        timeLabel: "Current Time:",
        loading: "Loading..."
    },
    zh: {
        navTitle: "哈利法克斯公交追踪器",
        welcome: "感谢使用哈利法克斯公交追踪器!",
        timeLabel: "当前时间：",
        loading: "加载中..."
    }
};

let currentLang = 'en'; // Default language

// Langugae function
function setLanguage(lang) {
    currentLang = lang;
    
    // Update Text on Screen
    document.getElementById('txt-nav-title').textContent = translations[lang].navTitle;
    document.getElementById('txt-welcome').textContent = translations[lang].welcome;
    document.getElementById('txt-time').textContent = translations[lang].timeLabel;
    
    // Update the time immediately so it doesn't wait 1 second to translate
    updateTime(); 
}

// Time function
function updateTime() {
    const timeElement = document.getElementById("current-time");
    const now = new Date();
    
    // Use 'en-US' or 'zh-CN' to format the date string correctly
    const locale = currentLang === 'zh' ? 'zh-CN' : 'en-US';
    const formattedTime = now.toLocaleTimeString(locale); 
    
    timeElement.textContent = formattedTime;
    timeElement.setAttribute("datetime", now.toISOString());
}

// Start the clock immediately and update every second
updateTime();
setInterval(updateTime, 1000);

// Initialize the map centered on Halifax
const map = L.map('map').setView([44.6488, -63.5752], 13);

        // Add the background map tiles (using OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

        // Storage for markers so we can update them instead of redrawing every time
    let busMarkers = {};

async function updateBuses() {
    try {
        const response = await fetch('https://halifax-bus-tracker-backend.onrender.com/buses');
        const buses = await response.json();

        buses.forEach(bus => {
            // Decide what text to show in the popup based on language
            const routeLabel = currentLang === 'zh' ? "路线" : "Route";
            const busLabel = currentLang === 'zh' ? "公交 ID" : "Bus ID";

            const popupContent = `<b>${routeLabel} ${bus.routeId}</b><br>${busLabel}: ${bus.id}`;

            if (busMarkers[bus.id]) {
                busMarkers[bus.id].setLatLng([bus.latitude, bus.longitude]);
                // Update the popup text if the language changed
                busMarkers[bus.id].getPopup().setContent(popupContent);
            } else {
                const marker = L.marker([bus.latitude, bus.longitude]).addTo(map);
                marker.bindPopup(popupContent);
                busMarkers[bus.id] = marker;
            }
        });
    } catch (error) {
        console.error("Error loading bus data:", error);
    }
}

        // Update the map every 5 seconds
        updateBuses();
        setInterval(updateBuses, 5000);