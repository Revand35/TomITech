console.log('[SW] Service worker script loaded - version 1.4');

const CACHE_NAME = 'moral-intelligence-v1.4';
const OFFLINE_URL = '/offline.html';

// Static files to cache (only essential static files)
const CACHE_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json'
];

// Ensure offline page is always available
const OFFLINE_FALLBACK = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - Moral Intelligence</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 20px;
        }
        .container { max-width: 400px; }
        h1 { font-size: 2rem; margin-bottom: 1rem; }
        p { opacity: 0.9; margin-bottom: 2rem; }
        button {
            background: white;
            color: #667eea;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            font-weight: 600;
        }
        button:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📡 Tidak Ada Koneksi</h1>
        <p>Anda sedang offline. Silakan periksa koneksi internet Anda.</p>
        <button onclick="window.location.reload()">Coba Lagi</button>
    </div>
</body>
</html>
`;

// URLs that should NEVER be cached (all dynamic content)
const NO_CACHE_PATTERNS = [
  // All JS files should be fresh
  '.js',
  '.mjs',
  // All HTML pages except offline
  'pages/',
  'auth/',
  'features/',
  'admin/',
  // Firebase and API calls
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'gstatic.com/firebasejs',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  // Our dynamic content
  'assets/js/',
  'config/',
  'api/',
  'stats',
  'users',
  'posts'
];

// External resources that can be cached
const EXTERNAL_RESOURCES = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com'
];

// Check if URL should not be cached
function shouldNotCache(url) {
  // Never cache if it contains any no-cache pattern
  if (NO_CACHE_PATTERNS.some(pattern => url.includes(pattern))) {
    return true;
  }

  // Never cache if it has query parameters (likely dynamic)
  try {
    const urlObj = new URL(url);
    if (urlObj.search && !url.includes('fonts.googleapis.com')) {
      return true;
    }
  } catch (e) {
    // If URL parsing fails, don't cache to be safe
    return true;
  }

  return false;
}

// Install event - cache only essential static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v1.4...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching essential static files only');
        return cache.addAll(CACHE_FILES).catch((error) => {
          console.error('[SW] Failed to cache some files:', error);
          // Still proceed even if some files fail
        });
      })
  );

  // Force immediate activation
  self.skipWaiting();
});

// Activate event - aggressively clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v1.4...');

  event.waitUntil(
    Promise.all([
      // Clear all old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - prioritize network for all dynamic content
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Skip cross-origin requests except allowed external resources
  if (!url.startsWith(self.location.origin) &&
      !EXTERNAL_RESOURCES.some(resource => url.startsWith(resource))) {
    return;
  }

  // For URLs that should not be cached, always go to network first
  if (shouldNotCache(url)) {
    console.log('[SW] Network-first for dynamic content:', url);
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone response for potential caching
          const responseClone = response.clone();

          // Don't cache dynamic content, just return fresh response
          return response;
        })
        .catch(error => {
          console.warn('[SW] Network failed for:', url, error);

          // For navigation requests, return offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL).then(response => {
              if (response) return response;
              // Fallback to inline HTML if offline page not cached
              return new Response(OFFLINE_FALLBACK, {
                status: 503,
                headers: { 'Content-Type': 'text/html' }
              });
            });
          }

          // For other requests, return a generic error response
          return new Response('Network error', {
            status: 503,
            statusText: 'Network error'
          });
        })
    );
    return;
  }

  // For cacheable static files, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url);

          // Serve from cache but also fetch fresh copy in background
          fetch(event.request)
            .then(response => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, responseClone));
              }
            })
            .catch(() => {
              // Fail silently for background updates
            });

          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone and cache only if it's a cacheable static file
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Network failed
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL).then(response => {
                if (response) return response;
                // Fallback to inline HTML if offline page not cached
                return new Response(OFFLINE_FALLBACK, {
                  status: 503,
                  headers: { 'Content-Type': 'text/html' }
                });
              });
            }

            return new Response('Network error', { status: 503 });
          });
      })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      console.log('[SW] All caches cleared');
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Periodic cache cleanup
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});

console.log('[SW] Service worker setup complete - v1.4');