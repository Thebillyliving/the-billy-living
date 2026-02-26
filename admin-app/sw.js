// ayooluwa Admin — Service Worker (network-first, no stale admin data)
const CACHE = 'ayooluwa-admin-v3';
const CORE  = ['/', '/index.html', '/manifest.json', '/db.js', '/firebase-config.js'];

self.addEventListener('install',  e => { e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method!=='GET'||!e.request.url.startsWith(self.location.origin)) return;
  // Network-first for admin: always get fresh data
  e.respondWith(fetch(e.request).then(r=>{caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>caches.match(e.request)));
});
