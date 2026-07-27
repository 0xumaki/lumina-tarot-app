/* Lumina Service Worker
   - Precache app shell + card back + manifest
   - Runtime cache for tarot card images (public domain Rider-Waite)
   - Offline fallback page
*/
const VERSION = "lumina-v1";
const PRECACHE = `${VERSION}-precache`;
const RUNTIME_IMG = `${VERSION}-img`;
const RUNTIME_API = `${VERSION}-api`;

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/tarot/card-back.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Don't intercept Next.js HMR / dev websocket
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // Tarot card images -> cache-first, runtime
  if (url.pathname.startsWith("/tarot/") && /\.(jpg|jpeg|png|webp)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(RUNTIME_IMG).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // Navigation requests -> network-first, fallback to cache then offline page
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(PRECACHE);
          cache.put(req, res.clone()).catch(() => {});
          return res;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          return (await caches.match("/offline.html")) || Response.error();
        }
      })()
    );
    return;
  }

  // Same-origin static assets -> cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => res))
    );
  }
});
