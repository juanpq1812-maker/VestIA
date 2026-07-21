// Preview de la story card generada, antes de mandarla afuera.
//
// Por qué existe este paso intermedio en vez de llamar navigator.share()
// directo desde ShareStoryCardButton: generar la imagen implica un viaje al
// servidor + cargar varias imágenes en canvas, lo que fácilmente supera la
// ventana de "user activation" (~5s en Chromium) que exige la Web Share API.
// Si share() se llama después de esos awaits, el navegador la rechaza con
// NotAllowedError incluso viniendo de un click real (lo reproduje en dev).
// Este modal resuelve eso: la imagen ya está lista cuando se abre, y el
// click en "Compartir" de ACÁ llama navigator.share() de forma síncrona
// dentro de su propio handler — gesto de usuario fresco, sin awaits antes.
"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

type Props = {
  previewUrl: string;
  canShareNative: boolean;
  outfitName: string | null;
  onShare: () => void;
  onDownload: () => void;
  onClose: () => void;
};

export default function StoryCardPreviewModal({
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
      aria-labelledby="story-card-preview-title"
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
            id="story-card-preview-title"
            className="font-display text-xl font-semibold text-text"
          >
            Tu story card
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {outfitName ?? "Lista para compartir"} — 9:16, ideal para
            Instagram/WhatsApp.
          </p>
        </header>

        <div className="bg-surface-2 p-5">
          <div className="mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-xl border border-border shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Vista previa de la story card"
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
