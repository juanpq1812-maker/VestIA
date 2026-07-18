"use client";

import { useEffect, useId, useRef } from "react";

const DO_TIPS = [
  {
    icon: "checkroom",
    title: "Prenda completa",
    desc: "Que se vea toda la prenda, de frente.",
  },
  {
    icon: "wb_sunny",
    title: "Buena iluminación",
    desc: "Usa luz natural o blanca, sin sombras fuertes.",
  },
  {
    icon: "auto_awesome",
    title: "Fondo limpio",
    desc: "Fondo neutro y sin objetos que distraigan.",
  },
] as const;

const AVOID_TIPS = [
  { icon: "bedtime", desc: "Fotos oscuras o con poca luz" },
  { icon: "blur_on", desc: "Imágenes borrosas" },
  { icon: "crop", desc: "Solo partes de la prenda" },
  { icon: "wallpaper", desc: "Fondos cargados o con objetos" },
] as const;

interface Props {
  /** Clave de localStorage donde se marca "ya vi los tips" — debe incluir el
   * user id (ver callers) para que cada cuenta nueva vea el modal al menos
   * una vez, sin depender de si el dispositivo ya lo mostró para otra cuenta. */
  storageKey: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function CameraTipsModal({ storageKey, onConfirm, onClose }: Props) {
  const titleId = useId();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the confirm button on mount for keyboard/screen-reader users
  useEffect(() => {
    confirmBtnRef.current?.focus();
  }, []);

  // Close on ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  function handleConfirm() {
    localStorage.setItem(storageKey, "1");
    onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-text/40 p-4 sm:items-center"
      style={{ animation: "fadeIn 160ms ease-out" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="material-symbols-outlined text-xl leading-none" aria-hidden="true">
            close
          </span>
        </button>

        <div className="max-h-[85vh] overflow-y-auto px-6 pb-6 pt-8">
          {/* Header */}
          <div className="text-center">
            <h2
              id={titleId}
              className="font-display text-2xl font-bold text-text"
            >
              Tips para una mejor recomendación
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-text-muted">
              Toma una foto clara de tu prenda siguiendo estas 3 indicaciones.
            </p>
          </div>

          {/* Do's */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {DO_TIPS.map((tip, i) => (
              <div key={tip.icon} className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
                  <span
                    className="material-symbols-outlined text-2xl leading-none"
                    aria-hidden="true"
                  >
                    {tip.icon}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-text">
                  {i + 1}. {tip.title}
                </p>
                <p className="mt-1 text-xs text-text-muted">{tip.desc}</p>
              </div>
            ))}
          </div>

          {/* Evita */}
          <div className="mt-6 rounded-xl border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white">
                <span className="material-symbols-outlined text-base leading-none" aria-hidden="true">
                  close
                </span>
              </div>
              <p className="text-sm font-semibold text-text">Evita</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {AVOID_TIPS.map((tip) => (
                <div key={tip.icon} className="flex flex-col items-center text-center">
                  <span
                    className="material-symbols-outlined text-2xl leading-none text-text-muted"
                    aria-hidden="true"
                  >
                    {tip.icon}
                  </span>
                  <p className="mt-1.5 text-xs text-text-muted">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-surface-2 px-6 py-4">
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={handleConfirm}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow-md hover:-translate-y-px active:translate-y-0 active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              className="material-symbols-outlined text-base leading-none"
              aria-hidden="true"
            >
              photo_camera
            </span>
            Entendido, tomar foto
          </button>
        </div>
      </div>
    </div>
  );
}
