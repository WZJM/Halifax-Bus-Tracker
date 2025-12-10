// --- 1. LANGUAGE DICTIONARY ---
const translations = {
    en: {
        navTitle: "HRM Bus Tracker",
        welcome: "Thanks for using HRM Bus Tracker!",
        timeLabel: "Current Time:",
        loading: "Loading...",
        errorTitle: "Data Feed Error",
        errorMessage: "Sorry, we are currently unable to gain real-time data from Halifax Transit due to unknown reasons on their end. The locations shown on the map may be inaccurate."
    },
    zh: {
        navTitle: "哈利法克斯公交追踪器",
        welcome: "感谢使用哈利法克斯公交追踪器!",
        timeLabel: "当前时间：",
        loading: "加载中...",
        errorTitle: "数据源错误",
        errorMessage: "抱歉，由于哈利法克斯公交公司数据问题，我们目前无法获取实时数据。地图上显示的公交位置可能不准确。"
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

    //Stale data detector variables
    let lastBusesJson = "";   // Stores the previous data as a string
    let staleCount = 0;       // Counts how many times data was identical
    const STALE_THRESHOLD = 15; // If data is same 15 times (75 seconds), show alert

    //Function to show error detail
    function showErrorDetail() {
    const title = translations[currentLang].errorTitle;
    const msg = translations[currentLang].errorMessage;
    alert(`${title}\n\n${msg}`);
}
    
async function updateBuses() {
    try {
        const response = await fetch('https://halifax-bus-tracker-backend.onrender.com/buses');
        const buses = await response.json();

        // Check for stale data
        const currentBusesJson = JSON.stringify(buses);
        const warningBtn = document.getElementById("warning-btn");

        // If the new data is exactly the same as the old data
        if (currentBusesJson === lastBusesJson && buses.length > 0) {
            staleCount++;
        } else {
            // Data changed! Reset the counter and hide warning
            staleCount = 0;
            warningBtn.style.display = "none";
        }

        // Save for next time
        lastBusesJson = currentBusesJson;

        // If we have hit the threshold, show the red icon
        if (staleCount >= STALE_THRESHOLD) {
            warningBtn.style.display = "flex";
            console.warn("Halifax Transit feed appears stuck.");
        }
        // ---------------------------------

        buses.forEach(bus => {
            const routeLabel = currentLang === 'zh' ? "路线" : "Route";
            const busLabel = currentLang === 'zh' ? "公交 ID" : "Bus ID";
            const popupContent = `<b>${routeLabel} ${bus.routeId}</b><br>${busLabel}: ${bus.id}`;

            if (busMarkers[bus.id]) {
                busMarkers[bus.id].setLatLng([bus.latitude, bus.longitude]);
                busMarkers[bus.id].getPopup().setContent(popupContent);
            } else {
                const marker = L.marker([bus.latitude, bus.longitude]).addTo(map);
                marker.bindPopup(popupContent);
                busMarkers[bus.id] = marker;
            }
        });
    } catch (error) {
        console.error("Error loading bus data:", error);
        // If the server crashes entirely, also show the warning
        document.getElementById("warning-btn").style.display = "flex";
    }
}

        // Update the map every 5 seconds
        updateBuses();
        setInterval(updateBuses, 5000);