// The Billy Living — Service Worker
const CACHE = 'tbl-client-v3';
const CORE  = ['/', '/index.html', '/manifest.json', '/db.js', '/firebase-config.js'];

self.addEventListener('install',  e => { e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method!=='GET'||!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).then(r=>{caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>caches.match(e.request)));
});
self.addEventListener('push', e => {
  const d = e.data?.json()||{};
  e.waitUntil(self.registration.showNotification(d.title||'The Billy Living',{body:d.body||'New update',icon:'/icons/icon-192.png',data:{url:d.url||'/'}}));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.openWindow(e.notification.data.url)); });
