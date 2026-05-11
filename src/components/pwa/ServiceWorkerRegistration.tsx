"use client";

// Registra el service worker en producción.
// Montado en el root layout como componente client.

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[SW] registro fallido:", err));
    }
  }, []);

  return null;
}
