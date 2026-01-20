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
        busLabel: "Bus ID",
        locationPopup: "You are here",
        locationNotSupportedAlert: "Geolocation is not supported by your browser",
        locationAlert: "Unable to retrieve your location. Please check your browser permissions.",
        searchPlaceholder: "Search Route (e.g. 1, 90)..."
    },
    fr: {
        navTitle: "Info-bus HRM",
        welcome: "Merci d'avoir utilisé Info-bus HRM",
        timeLabel: "Heure actuelle:",
        loading: "Chargement...",
        errorTitle: "Erreur de flux de données",
        errorMessage: "Nous sommes désolés, mais nous ne pouvons actuellement pas obtenir de données en temps réel de Halifax Transit pour des raisons inconnues de leur côté. Les emplacements affichés sur la carte peuvent donc être inexacts.",
        serverWaking: "Connexion au serveur...\nCela peut prendre jusqu'à 40 secondes si le serveur est en cours de démarrage.",
        routeLabel: "Ligne",
        busLabel: "ID du Bus",
        locationPopup: "Vous êtes ici",
        locationNotSupportedAlert: "La géolocalisation n'est pas prise en charge par votre navigateur",
        locationAlert: "Impossible de récupérer votre position. Veuillez vérifier les autorisations de votre navigateur.",
        searchPlaceholder: "Chercher un itinéraire..."
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
        busLabel: "公交 ID",
        locationPopup: "您在这里",
        locationNotSupportedAlert: "您的浏览器不支持地理位置功能",
        locationAlert: "无法获取您的位置。请检查浏览器权限。",
        searchPlaceholder: "搜索线路..."
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
    document.getElementById('route-search').placeholder = translations[lang].searchPlaceholder;

    if (userMarker) {
        userMarker.setPopupContent(translations[lang].locationPopup);
    }

    Object.values(busMarkers).forEach(marker => {
        if (marker.busData) {
            // Get the new labels (e.g., "Route" or "路线")
            const routeLabel = translations[lang].routeLabel;
            const busLabel = translations[lang].busLabel;
            
            // Re-create the popup string using the saved busData
            const newContent = `<b>${routeLabel} ${marker.busData.routeId}</b><br>${busLabel}: ${marker.busData.id}`;
            
            // Update the text immediately
            marker.setPopupContent(newContent);
        }
    }); 

    if (currentBusData.length > 0) {
        // Clear the cache so the function thinks it's new data
        availableRoutes.clear(); 
        // Re-run the builder with the current data
        updateRouteDropdown(currentBusData); 
    }
    
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

    // Search & Filter Variables
    let selectedRoutes = new Set(); // Stores specific routes user has checked (e.g. "90", "1")
    let availableRoutes = new Set(); // Stores all routes currently available from the API

    let currentBusData = [];

    let routeNames = {}; // Stores "90": "Larry Uteck"

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
        
        // --- NEW: READ SERVER HEADER ---
        const serverStaleCount = response.headers.get('X-Stale-Count');
        const warningBtn = document.getElementById("warning-btn");
        
        // If server says data is old (e.g. 5+ stale fetches = 75 seconds), show warning
        if (serverStaleCount && parseInt(serverStaleCount) >= 5) {
             warningBtn.style.display = "flex";
             console.warn(`Server reports stale data. Count: ${serverStaleCount}`);
        } else {
             warningBtn.style.display = "none";
        }

        const buses = await response.json();
        
        currentBusData = buses;

        if (isFirstLoad) {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            isFirstLoad = false; // Never show it again for this session
        }

        // 1. First, update the dropdown list with the latest data
        updateRouteDropdown(buses);

        // 2. Track which buses are valid in this update
        const activeBusIds = new Set();
        
        buses.forEach(bus => {
            // --- FILTER LOGIC ---
            // If we have selected routes, and this bus IS NOT in the selection, skip it.
            if (selectedRoutes.size > 0 && !selectedRoutes.has(bus.routeId)) {
                return; // Do not process this bus
            }
            // --------------------

            activeBusIds.add(bus.id); // Mark as active

            const routeLabel = translations[currentLang].routeLabel;
            const busLabel = translations[currentLang].busLabel;
            const name = routeNames[bus.routeId] ? ` (${routeNames[bus.routeId]})` : "";
            
            const popupContentBus = `
                <b>${routeLabel} ${bus.routeId}</b>${name}<br>
                ${busLabel}: ${bus.id}
            `;    

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
                busMarkers[bus.id].getPopup().setContent(popupContentBus);
                busMarkers[bus.id].busData = bus;

                if (!map.hasLayer(busMarkers[bus.id])) {
                    busMarkers[bus.id].addTo(map);
                }
            } else {
                const marker = L.marker([bus.latitude, bus.longitude], {icon: customIcon}).addTo(map);
                marker.bindPopup(popupContentBus);
                marker.busData = bus;
                busMarkers[bus.id] = marker;
            }
            
        });

        Object.keys(busMarkers).forEach(id => {
            if (!activeBusIds.has(id)) {
                map.removeLayer(busMarkers[id]);
                // NOTE: We don't delete it from memory completely so it comes back instantly if un-filtered
                // But removing from map is enough to hide it.
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

        // --- ROUTE NAMES FETCHER ---
async function fetchRouteNames() {
    try {
        const response = await fetch('https://halifax-bus-tracker-backend.onrender.com/routes');
        routeNames = await response.json();
        console.log("Route names loaded.");
        
        // If we already have bus data, refresh the list immediately to show names
        if (currentBusData.length > 0) {
            updateRouteDropdown(currentBusData);
        }
    } catch (error) {
        console.error("Failed to load route names:", error);
    }
}

        // Call this on startup!
        fetchRouteNames();

        // Function to locate user
let userMarker = null;

function locateUser() {
    const locationPopupContent = translations[currentLang].locationPopup;
    
    // Check if browser supports geolocation
    if (!navigator.geolocation) {
        alert(translations[currentLang].locationNotSupportedAlert);
        return;
    }

    // Ask for location
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Fly the map to the user
            map.setView([lat, lng], 15);

            // Create a "You are Here" marker (Red pulsing dot)
            if (userMarker) {
                userMarker.setLatLng([lat, lng]);
                userMarker.setPopupContent(locationPopupContent); 
                userMarker.openPopup();
            } else {
                // Simple red circle marker
                userMarker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: "#e74c3c",
                    color: "#fff",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(map);
                
                userMarker.bindPopup(locationPopupContent).openPopup();
            }
        },
        () => {
            alert(translations[currentLang].locationAlert);
        }
    );
}

// --- SEARCH & FILTER FUNCTIONS ---

// 1. Toggle the list when clicking the search bar
const searchInput = document.getElementById('route-search');
const routeList = document.getElementById('route-list');
const clearBtn = document.getElementById('clear-search');

searchInput.addEventListener('focus', () => {
    routeList.classList.add('active');
});

// Hide list if clicking outside (optional polish)
document.addEventListener('click', (e) => {
    const container = document.getElementById('search-container');
    if (!container.contains(e.target)) {
        routeList.classList.remove('active');
    }
});

// 2. Filter the checkbox list as user types
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.route-item');
    
    items.forEach(item => {
        const routeId = item.getAttribute('data-route');
        if (routeId.toLowerCase().includes(term)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
});

// 3. Clear everything
function clearSelection() {
    selectedRoutes.clear();
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    // Uncheck all boxes
    document.querySelectorAll('.route-checkbox').forEach(cb => cb.checked = false);
    
    // Show all items in list again
    document.querySelectorAll('.route-item').forEach(item => item.style.display = 'flex');
    
    updateBuses(); // Refresh map to show all
}

// 4. Update the Selection Set
function toggleRoute(routeId, isChecked) {
    if (isChecked) {
        selectedRoutes.add(routeId);
    } else {
        selectedRoutes.delete(routeId);
    }
    
    // Show/Hide "X" button
    if (selectedRoutes.size > 0) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
    
    updateBuses(); // Refresh map immediately
}

// 5. Build the Dropdown List
function updateRouteDropdown(buses) {
    // Get routes currently active on the road
    const liveRoutes = new Set(buses.map(b => b.routeId));

    // Get ALL routes from our static file (The Master List)
    // If the static file hasn't loaded yet, default to just the live routes
    const staticRouteIds = Object.keys(routeNames);
    const allRouteIds = staticRouteIds.length > 0 ? staticRouteIds : Array.from(liveRoutes);

    // 3. Combine and Sort
    const sortedRoutes = allRouteIds.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        if (numA === numB) return a.localeCompare(b);
        return numA - numB;
    });

    // Check if list needs update (Logic: size changed or static data finally arrived)
    if (areSetsEqual(new Set(sortedRoutes), availableRoutes) && staticRouteIds.length === 0) return;

    availableRoutes = new Set(sortedRoutes);
    routeList.innerHTML = "";

    sortedRoutes.forEach(routeId => {
        const div = document.createElement('div');
        div.className = 'route-item';
        div.setAttribute('data-route', routeId);
        
        const isChecked = selectedRoutes.has(routeId) ? 'checked' : '';
        const routeLabel = translations[currentLang].routeLabel; // "Route"
        
        // --- NEW: Get the name ---
        const name = routeNames[routeId] || ""; 
        // e.g., "90 Larry Uteck"
        
        div.innerHTML = `
            <input type="checkbox" class="route-checkbox" ${isChecked} value="${routeId}">
            <div class="route-info">
                <span class="route-number"><b>${routeId}</b></span>
                <span class="route-desc">${name}</span>
            </div>
        `;
        
        const checkbox = div.querySelector('input');
        checkbox.addEventListener('change', (e) => toggleRoute(routeId, e.target.checked));
        div.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                toggleRoute(routeId, checkbox.checked);
            }
        });

        routeList.appendChild(div);
    });
}

// Helper to compare Sets
function areSetsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (const item of a) if (!b.has(item)) return false;
    return true;
}