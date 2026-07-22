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

// ── Push ─────────────────────────────────────────────────────────────────────
// El payload lo arma src/lib/push/deliverNotification.ts (JSON.stringify de
// PushPayload: title, body, url?, icon?). Si el parseo falla, mostramos un
// fallback generico en vez de dejar la notificacion vacia.
self.addEventListener("push", (event) => {
  let payload = { title: "StrandIA", body: "Tienes una novedad." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // payload no era JSON valido — nos quedamos con el fallback
  }

  const { title, body, url, icon, badge } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || "/icon-192.png",
      badge: badge || "/icon-192.png",
      data: { url: url || "/outfits" },
    })
  );
});

// ── Notification click ───────────────────────────────────────────────────────
// Si ya hay una pestaña de StrandIA abierta, la enfocamos y navegamos ahi
// (evita abrir una pestaña nueva encima de la app instalada). Si no hay
// ninguna, abrimos data.url — o la pantalla de generar outfit del dia si el
// payload no traia url.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/outfits";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsList) => {
        for (const client of clientsList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
