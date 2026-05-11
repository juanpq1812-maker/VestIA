"use client";

// Banner de instalación para iOS.
// Solo se muestra en Safari iOS cuando la app NO está instalada como PWA,
// y solo la primera vez (guarda el estado en localStorage).

import { useEffect, useState } from "react";

export default function IOSInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Detectar iOS (iPhone, iPad, iPod)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    // Detectar si ya está instalada como PWA (standalone)
    const isStandalone =
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
      window.matchMedia("(display-mode: standalone)").matches;

    // Solo mostrar en iOS Safari, no instalada, y si el usuario no la cerró antes
    if (isIOS && !isStandalone) {
      try {
        const yaVisto = localStorage.getItem("vestia-ios-banner-dismissed");
        if (!yaVisto) setVisible(true);
      } catch {
        // localStorage puede no estar disponible en modo privado
      }
    }
  }, []);

  function cerrar() {
    setVisible(false);
    try {
      localStorage.setItem("vestia-ios-banner-dismissed", "1");
    } catch {
      // silencioso
    }
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 m-3 rounded-2xl border border-border bg-surface shadow-lg"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span aria-hidden="true" className="mt-0.5 text-2xl shrink-0">
          📲
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">
            Instalá VestIA en tu iPhone
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            Tocá{" "}
            <span aria-label="el ícono de compartir" className="inline-block">
              <ShareIcon />
            </span>{" "}
            y luego &ldquo;Agregar a pantalla de inicio&rdquo;
          </p>
        </div>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block align-middle text-primary"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
