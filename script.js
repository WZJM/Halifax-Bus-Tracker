// Language Dictionary
const translations = {
    en: {
        navTitle: "HRM Bus Tracker",
        welcome: "Thank you for using HRM Bus Tracker!",
        timeLabel: "Current Time:",
        loading: "Loading...",
        errorTitle: "Data Feed Error",
        errorMessage: "Sorry, we are currently unable to gain real-time data from Halifax Transit due to unknown reasons on their end. The locations shown on the map may be inaccurate.",
        serverWaking: "Connecting to server...\nThis may take up to 40 seconds if the server is waking up.",
        routeLabel: "Route",
        busLabel: "Bus ID"
    },
    fr: {
        navTitle: "Info-bus HRM",
        welcome: "Merci d'avoir utilisé Info-bus HRM",
        timeLabel: "Heure actuelle:",
        loading: "Chargement...",
        errorTitle: "Erreur de flux de données",
        errorMessage: "Nous sommes désolés, mais nous ne pouvons actuellement pas obtenir de données en temps réel de Halifax Transit pour des raisons inconnues de leur côté. Les emplacements affichés sur la carte peuvent donc être inexacts.",
        serverWaking: "Connexion au serveur...\nCela peut prendre jusqu'à 40 secondes si le serveur est en cours de démarrage.",
        routeLabel: "Route",
        busLabel: "ID du Bus"
    },
    zh: {
        navTitle: "哈利法克斯公交追踪器",
        welcome: "感谢使用哈利法克斯公交追踪器!",
        timeLabel: "当前时间：",
        loading: "加载中...",
        errorTitle: "数据源错误",
        errorMessage: "抱歉，由于哈利法克斯公交公司数据问题，我们目前无法获取实时数据。地图上显示的公交位置可能不准确。",
        serverWaking: "正在连接服务器...\n如果服务器正在唤醒,可能需要等待40秒。",
        routeLabel: "线路",
        busLabel: "公交 ID"
    }
};
// Time formating dictionary
const timeFormat = {
    en: {
        locale: 'en-US'
    },
    fr: {
        locale: 'fr-CA'
    },
    zh: {
        locale: 'zh-CN'
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
    document.getElementById('txt-loading-msg').textContent = translations[lang].serverWaking;
    
    // Update the time immediately so it doesn't wait 1 second to translate
    updateTime(); 
}

// Time function
function updateTime() {
    const timeElement = document.getElementById("current-time");
    const now = new Date();
    
    const locale = timeFormat[currentLang].locale;
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
    const STALE_THRESHOLD = 10; // If data is same 10 times (50 seconds), show alert

    //Function to show error detail
    function showErrorDetail() {
    const title = translations[currentLang].errorTitle;
    const msg = translations[currentLang].errorMessage;
    alert(`${title}\n\n${msg}`);
}

let isFirstLoad = true; 

async function updateBuses() {
    try {
        const response = await fetch('https://halifax-bus-tracker-backend.onrender.com/buses');
        const buses = await response.json();

        if (isFirstLoad) {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            isFirstLoad = false; // Never show it again for this session
        }

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

        buses.forEach(bus => {
            const routeLabel = translations[currentLang].routeLabel;
            const busLabel = translations[currentLang].busLabel;
            const popupContent = `<b>${routeLabel} ${bus.routeId}</b><br>${busLabel}: ${bus.id}`;

            const customIcon = L.divIcon({
                className: 'custom-bus-icon-wrapper', 
                html: `
                    <div class="bus-marker-container">
                        <div class="arrow-orbit" style="transform: rotate(${bus.bearing}deg);">
                            <div class="bus-arrow"></div>
                        </div>
                        
                        <div class="bus-box">${bus.routeId}</div>
                    </div>
                `,
                iconSize: [30, 30], 
                iconAnchor: [15, 15] 
            });

            if (busMarkers[bus.id]) {
                busMarkers[bus.id].setLatLng([bus.latitude, bus.longitude]);
                busMarkers[bus.id].setIcon(customIcon);
                busMarkers[bus.id].getPopup().setContent(popupContent);
            } else {
                const marker = L.marker([bus.latitude, bus.longitude], {icon: customIcon}).addTo(map);
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