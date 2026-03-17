const CACHE_NAME = "scribe-v2";
const PRECACHE_URLS = ["/", "/app", "/app/entries", "/app/new", "/icon-192x192.png", "/icon-512x512.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  // Cache-first navigations keep the shell instant while the network refreshes in the background.
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetched = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            void cache.put(event.request, clone);
          }
          return response;
        });

        if (cached) {
          event.waitUntil(fetched.catch(() => undefined));
          return cached;
        }

        return fetched.catch(() => cache.match("/") || Response.error());
      })
    );
    return;
  }

  // Stale-while-revalidate for other requests
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || fetched;
    })
  );
});
