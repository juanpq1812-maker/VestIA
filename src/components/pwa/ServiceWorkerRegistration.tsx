"use client";

// Registra el service worker en producción.
// Montado en el root layout como componente client.

import { useEffect } from "react";

// `sw.js` es un archivo estático: entre despliegues es byte a byte idéntico,
// así que el navegador no veía motivo para reinstalarlo y la caché vieja
// sobrevivía para siempre. Registrarlo con `?v=<build>` cambia la URL del
// script en cada deploy, que es lo que dispara la reinstalación — y de paso
// el propio SW lee ese `v` para nombrar su caché.
//
// El scope se declara explícito: la query no lo altera, pero dejarlo escrito
// evita que un cambio futuro en la URL mueva el scope sin querer.
const SW_URL = `/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}`;

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register(SW_URL, { scope: "/" })
      .then((registration) => {
        // Al volver a la app tras un despliegue, la pestaña puede estar
        // controlada por el SW anterior. Pedirle a Chrome/Safari que revise
        // si hay versión nueva acelera el relevo en vez de esperar a su
        // chequeo periódico.
        registration.update().catch(() => {});
      })
      .catch((err) => console.warn("[SW] registro fallido:", err));
  }, []);

  return null;
}
