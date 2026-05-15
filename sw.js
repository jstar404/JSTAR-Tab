const CACHE_PREFIX = "jstartab-cache";
const VERSION_URL = "https://tinyurl.com/jstartab";
const STATIC_CACHE = "jstartab-static";
const FONTS_CACHE = "jstartab-fonts";

const FALLBACK_FAVICON_SVG = "icons.svg#globe";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => 
      cache.add(VERSION_URL).catch(() => {})
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("message", async (event) => {
  if (event.data.action === "updateFavicons") {
    try {
      const faviconUrls = event.data.urls;
      const currentDate = new Date();
      const cacheName = `${CACHE_PREFIX}-${currentDate.toISOString().split("T")[0]}`;
      const cache = await caches.open(cacheName);

      await Promise.allSettled(
        faviconUrls.map((url) => 
          fetch(new Request(url, { mode: 'no-cors' }))
            .then((res) => cache.put(url, res))
            .catch(() => {})
        )
      );

      const keys = await caches.keys();
      keys.forEach((key) => {
        if (key.startsWith(CACHE_PREFIX) && key !== cacheName) {
          caches.delete(key);
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      caches.open(FONTS_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) return response;

          return fetch(request)
            .then((networkResponse) => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            })
            .catch(() => {
              return new Response(null, { status: 404 });
            });
        });
      }),
    );
    return;
  }

  if (event.request.url.startsWith("https://www.google.com/s2/favicons")) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) return response;

        return fetch(new Request(event.request.url, { mode: 'no-cors' }))
          .then((fetchResponse) => {
            const cacheCopy = fetchResponse.clone();
            const dateStr = new Date().toISOString().split("T")[0];
            caches
              .open(`${CACHE_PREFIX}-${dateStr}`)
              .then((cache) => {
                cache.put(event.request, cacheCopy);
              })
              .catch(() => {});

            return fetchResponse;
          })
          .catch(() => {
            return fetch(FALLBACK_FAVICON_SVG);
          });
      }),
    );
    return;
  }

  if (request.url === VERSION_URL) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        fetch(request)
          .then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          })
          .catch(
            () =>
              cache.match(request) ||
              new Response(JSON.stringify({ error: "offline" })),
          ),
      ),
    );
  }
});