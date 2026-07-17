"use client";

import { useEffect, useId, useRef, useState } from "react";

const LS_KEY = "strandia_camera_tips_seen";

const TIPS = [
  {
    icon: "wb_sunny",
    title: "Luz natural",
    desc: "Fotografía cerca de una ventana con luz del día para que los colores salgan fieles.",
  },
  {
    icon: "crop_free",
    title: "Fondo neutro",
    desc: "Usa una pared blanca o una cama ordenada para que la prenda destaque.",
  },
  {
    icon: "straighten",
    title: "Prenda extendida",
    desc: "Estirala sobre una superficie plana o colgala para que se vea toda la forma.",
  },
  {
    icon: "center_focus_strong",
    title: "Encuadre completo",
    desc: "Asegurate de que la prenda entre entera en el cuadro, sin recortes.",
  },
] as const;

interface Props {
  onConfirm: () => void;
  onClose: () => void;
}

export default function CameraTipsModal({ onConfirm, onClose }: Props) {
  const titleId = useId();
  const [dontShowAgain, setDontShowAgain] = useState(false);
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
    if (dontShowAgain) localStorage.setItem(LS_KEY, "1");
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
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        {/* Header */}
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Antes de abrir la cámara
          </p>
          <h2
            id={titleId}
            className="mt-1 font-display text-xl font-semibold text-text"
          >
            Tips para una buena foto
          </h2>
        </div>

        {/* Tips */}
        <ul className="divide-y divide-border px-5">
          {TIPS.map((tip) => (
            <li key={tip.icon} className="flex items-start gap-4 py-4">
              <span
                className="material-symbols-outlined mt-0.5 shrink-0 text-2xl text-primary"
                aria-hidden="true"
              >
                {tip.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-text">{tip.title}</p>
                <p className="mt-0.5 text-xs text-text-muted">{tip.desc}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="border-t border-border bg-surface-2 px-5 py-4">
          {/* Checkbox "No mostrar de nuevo" */}
          <label className="mb-4 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <span className="text-sm text-text-muted">No mostrar de nuevo</span>
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-transparent px-6 py-3 text-sm font-semibold text-text-muted transition-all duration-200 ease-out hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cancelar
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow-md hover:-translate-y-px active:translate-y-0 active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span
                className="material-symbols-outlined text-base leading-none"
                aria-hidden="true"
              >
                photo_camera
              </span>
              Entendido, abrir cámara
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
