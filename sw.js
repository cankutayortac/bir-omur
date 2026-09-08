'use strict';
const CACHE = 'bir-omur-v3-20260908-2';
const ROOT = new URL('./', self.location.href).href;
const FILES = ['./','index.html','styles.css','content.js','engine.js','avatar.js','game.js','pwa.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable.png','icons/apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new URL(file, ROOT).href))));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('bir-omur-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.href.startsWith(ROOT) || url.origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const match = await cache.match(event.request, {ignoreSearch:true});
    if (match) return match;
    try { return await fetch(event.request); }
    catch {
      if(event.request.mode === 'navigate') return cache.match(new URL('index.html', ROOT).href);
      return new Response('Çevrimdışı', {status:503});
    }
  }));
});
