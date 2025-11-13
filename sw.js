// Redirect to new service worker location
console.log('[SW] Legacy service worker - redirecting to new location');

// Unregister this service worker and redirect to new one
self.addEventListener('install', () => {
    console.log('[SW] Legacy SW installing - will be replaced');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Legacy SW activating - will be replaced');
    event.waitUntil(
        // Clear old caches and unregister
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }).then(() => {
            // Force reload to register new SW
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({type: 'RELOAD_FOR_NEW_SW'});
                });
            });
        })
    );
});

// Minimal fetch handler
self.addEventListener('fetch', (event) => {
    // Just pass through to network
    event.respondWith(fetch(event.request));
});
