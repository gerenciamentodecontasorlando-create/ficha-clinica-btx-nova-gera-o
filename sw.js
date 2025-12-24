/* Service Worker — BTX Docs Saúde
   Offline-first simples e confiável.
*/
const CACHE_NAME = "btx-docs-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event)=>{
  event.waitUntil(
    caches.keys().then(keys=>{
      return Promise.all(
        keys.map(k=> (k!==CACHE_NAME ? caches.delete(k) : Promise.resolve()))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event)=>{
  const req = event.request;
  event.respondWith(
    caches.match(req).then(cached=>{
      if(cached) return cached;
      return fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(req, copy));
        return res;
      }).catch(()=>caches.match("./index.html"));
    })
  );
});
