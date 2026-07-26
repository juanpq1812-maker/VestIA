// Detecta si el navegador está offline (`navigator.onLine` + eventos
// `online`/`offline`). Se usa en el flujo de ráfaga (BurstCapture,
// ReviewGrid) para avisar al usuario ANTES de que suba una foto y se
// encuentre con un error de red a mitad del pipeline — mejor prevenir que
// mostrar un "Load failed" después.
//
// `navigator.onLine` solo detecta "sin adaptador de red activo" (ej. modo
// avión) — no garantiza que haya internet real (podés estar conectado a un
// wifi sin salida). Es una señal imperfecta pero gratis y sin falsos
// negativos: si dice offline, offline está.

"use client";

import { useEffect, useState } from "react";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
