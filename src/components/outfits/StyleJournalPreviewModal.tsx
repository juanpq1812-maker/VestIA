// Preview del Style Journal exportado, antes de compartirlo — mismo patrón
// de dos pasos que StoryCardPreviewModal.tsx (comunidad/free), duplicado a
// propósito en vez de reusado: son dos caminos de compartir independientes
// (ver Fase 4 del plan) y no queremos acoplar el share de comunidad al de
// Premium por una coincidencia de layout.
//
// Por qué existe este paso intermedio: componer la imagen implica cargar
// varias fotos + fuentes en canvas, lo que puede superar la ventana de "user
// activation" que exige la Web Share API. Si share() se llama después de
// esos awaits, el navegador la rechaza con NotAllowedError incluso viniendo
// de un click real. Este modal resuelve eso: la imagen ya está lista cuando
// se abre, y el click en "Compartir" de ACÁ llama navigator.share() de forma
// síncrona dentro de su propio handler.
"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

type Props = {
  previewUrl: string;
  canShareNative: boolean;
  outfitName: string;
  onShare: () => void;
  onDownload: () => void;
  onClose: () => void;
};

export default function StyleJournalPreviewModal({
  previewUrl,
  canShareNative,
  outfitName,
  onShare,
  onDownload,
  onClose,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="style-journal-preview-title"
      className="fixed inset-0 z-40 flex items-end justify-center bg-text/40 p-4 sm:items-center"
      style={{ animation: "fadeIn 160ms ease-out" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <header className="border-b border-border px-5 py-4">
          <h2
            id="style-journal-preview-title"
            className="font-display text-xl font-semibold text-text"
          >
            Tu Style Journal
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {outfitName} — 9:16, ideal para Instagram/WhatsApp.
          </p>
        </header>

        <div className="bg-surface-2 p-5">
          <div className="mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-xl border border-border shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Vista previa del Style Journal"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
          <Button variant="ghost" onClick={onDownload} type="button">
            Descargar
          </Button>
          {canShareNative && (
            <Button variant="primary" onClick={onShare} type="button">
              Compartir
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
