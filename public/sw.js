// Service Worker de StrandIA — estrategia Network First, Cache Fallback.
// Se instala automáticamente desde layout.tsx.

const CACHE_NAME = "strandia-v2";

// Assets estáticos que cacheamos al instalar
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-512.png",
  "/apple-touch-icon.png",
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Activar inmediatamente sin esperar a que se cierre la pestaña actual
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  // Eliminar caches viejos (versiones anteriores)
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// ── Fetch — Network First, Cache Fallback ────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Solo interceptamos GETs. Las peticiones a Supabase/OpenRouter van directo a red.
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // No interceptamos peticiones a dominios externos (Supabase, OpenRouter, etc.)
  if (url.origin !== self.location.origin) return;

  // No interceptamos rutas de API de Next.js
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Solo cacheamos respuestas exitosas de recursos estáticos
        if (
          networkResponse.ok &&
          (url.pathname.startsWith("/_next/static") ||
            PRECACHE_URLS.includes(url.pathname))
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() =>
        // Red no disponible → intentamos desde cache
        caches.match(event.request).then(
          (cached) => cached ?? new Response("Sin conexión", { status: 503 })
        )
      )
  );
});
