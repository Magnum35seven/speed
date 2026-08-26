const CACHE_NAME = 'hud-speed-v05';

// Relative paths resolve against the service worker's own scope,
// so this works whether hosted at a domain root or a GitHub Pages
// repo subpath (https://user.github.io/repo-name/) without changes.
// Note: the sport-gauge artwork is embedded directly in index.html as a
// base64 data URI (not a separate file), so it loads with the page itself
// and never depends on a separate cached/network request.
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Network-first, falling back to cache only when offline. This way the
    // app always reflects the latest deployed files when a connection is
    // available, and only serves the last-known-good cached copy when it
    // isn't (e.g. no signal while driving). The cached copy is refreshed
    // on every successful network fetch.
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
