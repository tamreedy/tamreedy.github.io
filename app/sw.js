// تمريضي web app service worker.
// Caches the app shell so the app opens fast and works with a weak connection.
// API calls (tamreedy-server.onrender.com) are NEVER cached: they always go to
// the network so data is always live.
const CACHE = 'tamreedy-shell-v3';
const SHELL = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // API & non-GET: network only
    // version.json and the app shell must never come from the cache (the update check depends on them)
    if (url.pathname.endsWith('/version.json')) return;
    if (e.request.mode === 'navigate') {
        // App shell: network first, fall back to cache when offline.
        e.respondWith(fetch(e.request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy));
            return res;
        }).catch(() => caches.match('./index.html')));
        return;
    }
    // Static assets: cache first.
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
    })));
});
