// I Dream of Cake — Field App Service Worker
const CACHE = 'idoc-field-v1';
const OFFLINE_ASSETS = [
  '/companion.html',
  '/companion-manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only cache GET requests
  if (e.request.method !== 'GET') return;

  // Don't intercept Firebase / Google API calls — they need live network
  const url = e.request.url;
  if (
    url.includes('firebaseapp.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('firestore.googleapis.com')
  ) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Return cached version if available, else fetch from network
      return cached || fetch(e.request).then(response => {
        // Cache successful responses for companion.html
        if (response.ok && url.includes('companion.html')) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // If offline and not cached, return companion.html as fallback
        if (e.request.mode === 'navigate') {
          return caches.match('/companion.html');
        }
      });
    })
  );
});
