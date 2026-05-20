const browserAPI = typeof browser !== "undefined" ? browser : chrome;

const CACHE_PREFIX = "jstartab-cache";
const VERSION_URL = "https://tinyurl.com/jstartab";
const STATIC_CACHE = "jstartab-static";
const FONTS_CACHE = "jstartab-fonts";

const CORE_ASSETS = [
  "icons.svg",
  "images/icon16.png",
  "images/icon48.png",
  "images/icon128.png",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.all([
          cache.add(VERSION_URL),
          ...CORE_ASSETS.map((asset) => cache.add(asset).catch(() => {})),
        ]),
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
        faviconUrls.map((url) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          return fetch(
            new Request(url, { mode: "no-cors", signal: controller.signal }),
          )
            .then((res) => {
              clearTimeout(timeoutId);
              if (res.type === "opaque" || res.ok) {
                return cache.put(url, res);
              }
            })
            .catch(() => {
              clearTimeout(timeoutId);
            });
        }),
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

  if (url.href.startsWith("https://www.google.com/s2/favicons")) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) return response;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        return fetch(
          new Request(request.url, {
            mode: "no-cors",
            signal: controller.signal,
          }),
        )
          .then((networkResponse) => {
            clearTimeout(timeoutId);
            if (networkResponse.type === "opaque" || networkResponse.ok) {
              const cacheCopy = networkResponse.clone();
              const dateStr = new Date().toISOString().split("T")[0];
              caches
                .open(`${CACHE_PREFIX}-${dateStr}`)
                .then((cache) => {
                  cache.put(event.request, cacheCopy);
                })
                .catch(() => {});
              return networkResponse;
            }
            return new Response(null, { status: 404 });
          })
          .catch(() => {
            clearTimeout(timeoutId);
            return new Response(null, { status: 404 });
          });
      }),
    );
    return;
  }

  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com" ||
    url.hostname === "cdnjs.cloudflare.com"
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
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).catch(() => {
          return new Response(null, { status: 404 });
        })
      );
    }),
  );
});
