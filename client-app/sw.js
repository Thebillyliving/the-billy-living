const CACHE = 'billyliving-v4';
const ASSETS = ['/', '/manifest.json', '/ic_launcher-web.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept Firebase/Google traffic — Firebase falls back to
  // long-polling XHR when websockets are blocked, and a service worker
  // grabbing those requests can break that fallback entirely.
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com')) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache as we go — previously ONLY the install-time ASSETS list
        // was ever cached, so anything else (fonts, the Firebase SDK
        // scripts) stayed uncached even after repeat visits.
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
