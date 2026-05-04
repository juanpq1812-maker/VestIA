// Toast minimalista para confirmaciones rapidas.
//
// No usamos provider global porque el alcance del PR es chico: cada pantalla
// que lo necesite mantiene su propio `useState<string | null>` y renderiza
// este componente cuando hay mensaje. Auto-dismiss a los 3.5s.
//
// Si en el futuro queremos toasts encadenados o desde varios sitios, pasamos
// a un context provider — por ahora YAGNI.

"use client";

import { useEffect } from "react";

type Kind = "success" | "error" | "info";

type Props = {
  message: string;
  kind?: Kind;
  onDismiss: () => void;
  /** ms antes de auto-cerrarse. */
  durationMs?: number;
};

const KIND_CLASSES: Record<Kind, string> = {
  success: "border-success/30 bg-success-light text-success",
  error: "border-danger/30 bg-danger-light text-danger",
  info: "border-primary-mid bg-primary-light text-primary",
};

const KIND_ICON: Record<Kind, string> = {
  success: "✓",
  error: "!",
  info: "i",
};

export default function Toast({
  message,
  kind = "success",
  onDismiss,
  durationMs = 3500,
}: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [onDismiss, durationMs, message]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div
        className={[
          "pointer-events-auto flex max-w-md items-center gap-3 rounded-full border px-5 py-3 text-sm font-medium shadow-lg",
          "animate-[fadeInUp_180ms_ease-out]",
          KIND_CLASSES[kind],
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/60 text-xs font-bold"
        >
          {KIND_ICON[kind]}
        </span>
        <span>{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar"
          className="ml-2 rounded-full px-2 text-xs opacity-70 hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
