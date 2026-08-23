// Minimal service worker — its only real job is satisfying installability.
// This app is a live, database-backed dashboard: it deliberately does NOT
// cache pages, API routes, or server actions, since serving stale dashboard
// data or a stale order status would be actively wrong. Only same-origin GET
// requests for static, content-hashed assets are cached.
const CACHE_NAME = "monetized-shell-v1";
const PRECACHE_URLS = ["/icon.svg", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never touch mutations/server actions

  const url = new URL(request.url);
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || PRECACHE_URLS.includes(url.pathname));
  if (!isStaticAsset) return; // let everything else (pages, API routes) hit the network normally

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    }),
  );
});
