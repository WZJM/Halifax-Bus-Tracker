const CACHE_NAME = 'hrm-bus-cache-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json'
];

// 1. Install Event: Save static files to the phone
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching static assets...');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// 2. Activate Event: Clean up old caches if we update the app
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Fetch Event: Intercept network requests
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // CRITICAL: NEVER cache API calls to Render. Always go to the network.
    if (requestUrl.hostname.includes('onrender.com')) {
        return; // Bypasses the service worker, fetches live data naturally
    }

    // For map tiles (OpenStreetMap), try network first, then cache
    if (requestUrl.hostname.includes('openstreetmap.org')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return cachedResponse || fetch(event.request);
            })
        );
        return;
    }

    // For our static files (HTML, CSS, JS), use Cache-First strategy
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // Return instantly from phone memory
            }
            return fetch(event.request); // Otherwise go to the internet
        })
    );
});