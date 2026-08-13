// Botón "Compartir mi Style Journal" — solo visible para Premium (ver
// SavedOutfitCard.tsx), exporta el cuaderno como imagen 9:16.
//
// Más simple que ShareStoryCardButton.tsx (comunidad/free): no depende de un
// community_share ni de una server action — items/outfitName ya están en el
// cliente, así que composeStyleJournalImage() se llama directo. Mismo patrón
// de dos pasos (genera → preview → "Compartir" dentro del preview dispara
// navigator.share() con gesto de usuario fresco) para no repetir el
// NotAllowedError de activación expirada que StoryCardPreviewModal.tsx ya
// documenta y resuelve.

"use client";

import { useState } from "react";
import Toast from "@/components/ui/Toast";
import StyleJournalPreviewModal from "@/components/outfits/StyleJournalPreviewModal";
import { composeStyleJournalImage } from "@/lib/outfits/composeStyleJournalImage";
import type { ClothingItem } from "@/types/database";

type Props = {
  outfitId: string;
  outfitName: string;
  items: ClothingItem[];
};

type ToastState = { msg: string; kind: "success" | "error" | "info" } | null;

type PreviewState = {
  blob: Blob;
  previewUrl: string;
  fileName: string;
};

function canShareFiles(file: File): boolean {
  return (
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    "canShare" in navigator &&
    navigator.canShare({ files: [file] })
  );
}

export default function ShareStyleJournalButton({ outfitId, outfitName, items }: Props) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  async function onGenerate() {
    setLoading(true);
    try {
      const blob = await composeStyleJournalImage(items, outfitName);
      const fileName = `strandia-style-journal-${outfitId.slice(0, 8)}.jpg`;
      setPreview({ blob, previewUrl: URL.createObjectURL(blob), fileName });
    } catch {
      setToast({ msg: "No pudimos generar la imagen. Intenta de nuevo.", kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.previewUrl);
    setPreview(null);
  }

  async function onShareNative() {
    if (!preview) return;
    const file = new File([preview.blob], preview.fileName, { type: "image/jpeg" });
    try {
      await navigator.share({
        files: [file],
        title: outfitName,
        text: `${outfitName} — vía StrandIA`,
      });
      closePreview();
    } catch (err) {
      // AbortError = el usuario cerró el share sheet, no es un error real.
      if (!(err instanceof Error) || err.name !== "AbortError") {
        setToast({ msg: "No pudimos abrir el menú de compartir.", kind: "error" });
      }
    }
  }

  function onDownload() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.previewUrl;
    a.download = preview.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setToast({ msg: "Imagen descargada — compártela donde quieras", kind: "success" });
    closePreview();
  }

  return (
    <>
      <button
        type="button"
        onClick={onGenerate}
        disabled={loading}
        aria-busy={loading}
        className={[
          "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          "border-primary-mid bg-primary-light text-primary hover:bg-primary hover:text-white",
          "disabled:cursor-not-allowed disabled:opacity-60",
        ].join(" ")}
      >
        {loading ? (
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
          />
        ) : (
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
            <path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
          </svg>
        )}
        <span>{loading ? "Generando..." : "Compartir mi Style Journal"}</span>
      </button>

      {preview && (
        <StyleJournalPreviewModal
          previewUrl={preview.previewUrl}
          outfitName={outfitName}
          canShareNative={canShareFiles(
            new File([preview.blob], preview.fileName, { type: "image/jpeg" })
          )}
          onShare={onShareNative}
          onDownload={onDownload}
          onClose={closePreview}
        />
      )}

      {toast && <Toast message={toast.msg} kind={toast.kind} onDismiss={() => setToast(null)} />}
    </>
  );
}
