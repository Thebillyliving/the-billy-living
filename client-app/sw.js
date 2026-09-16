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

// ─── FCM background push ─────────────────────────────────────────────────
// importScripts runs in the service worker's own startup context, not
// through the 'fetch' handler above — so this doesn't conflict with the
// Firebase-traffic exclusion in that handler, which only governs requests
// the PAGE makes, not the worker's own script loading.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBbs6k7PInHUnv1x9FzHB31kUwrCcoGG7c",
  authDomain: "the-billy-living.firebaseapp.com",
  databaseURL: "https://the-billy-living-default-rtdb.firebaseio.com",
  projectId: "the-billy-living",
  storageBucket: "the-billy-living.firebasestorage.app",
  messagingSenderId: "808519759419",
  appId: "1:808519759419:web:5578b49e27079039dc4e1e"
});

const messaging = firebase.messaging();

// Fires when a push arrives while the app is closed / not the focused tab —
// this is the actual "posts still enter my phone overnight" mechanic.
// Foreground messages (app open) are handled separately, in index.html's
// fbMessaging.onMessage(), since FCM does not route those here.
messaging.onBackgroundMessage(payload => {
  const title = (payload.notification && payload.notification.title) || 'The Billy Living';
  const options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/ic_launcher-web.png',
    badge: '/ic_launcher-web.png',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
