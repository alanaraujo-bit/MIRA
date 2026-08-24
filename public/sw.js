const CACHE = "mira-shell-v2";
const SAFE_SHELL = ["/", "/offline", "/manifest.webmanifest", "/og.png", "/api/icon"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SAFE_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  const isSensitive = url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/go/") ||
    url.pathname.startsWith("/product") ||
    url.pathname.startsWith("/signin-with-chatgpt") ||
    url.pathname.startsWith("/signout-with-chatgpt") ||
    url.pathname.startsWith("/callback");

  if (isSensitive) {
    event.respondWith(fetch(event.request).catch(() => {
      if (event.request.mode === "navigate") return caches.match("/offline");
      return new Response(JSON.stringify({ error: "Sem conexão." }), {
        status: 503,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }));
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok && response.type === "basic") {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
    }
    return response;
  }).catch(() => event.request.mode === "navigate" ? caches.match("/offline") : Response.error())));
});
