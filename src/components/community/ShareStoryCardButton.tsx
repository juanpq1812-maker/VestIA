// Botón "Compartir afuera": exporta el share de comunidad como story card
// 9:16 (foto real + stickers de prendas + marca).
//
// Flujo en dos pasos (ver StoryCardPreviewModal.tsx para el porqué): 1) este
// botón genera la imagen (server action + composición canvas, toma unos
// segundos) y abre un preview; 2) el click en "Compartir" DENTRO del preview
// llama navigator.share() de forma síncrona, con un gesto de usuario fresco,
// evitando el NotAllowedError de la Web Share API por activación expirada.
//
// Solo se renderiza para el dueño del share — ver CommunityShareCard.tsx. La
// generación de datos pasa por getShareStoryCardDataAction, que vuelve a
// validar ownership en servidor (la UI nunca es la única barrera).

"use client";

import { useState } from "react";
import Toast from "@/components/ui/Toast";
import StoryCardPreviewModal from "@/components/community/StoryCardPreviewModal";
import { getShareStoryCardDataAction } from "@/lib/community/storyCard";
import { composeStoryCard } from "@/lib/community/storyCardCanvas";

type Props = {
  shareId: string;
};

type ToastState = { msg: string; kind: "success" | "error" | "info" } | null;

type PreviewState = {
  blob: Blob;
  previewUrl: string;
  outfitName: string | null;
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

export default function ShareStoryCardButton({ shareId }: Props) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  async function onGenerate() {
    setLoading(true);
    try {
      const res = await getShareStoryCardDataAction(shareId);
      if (!res.ok) {
        setToast({ msg: res.error, kind: "error" });
        return;
      }

      const blob = await composeStoryCard(res.data);
      const fileName = `strandia-${shareId.slice(0, 8)}.jpg`;
      setPreview({
        blob,
        previewUrl: URL.createObjectURL(blob),
        outfitName: res.data.outfitName,
        fileName,
      });
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
        title: preview.outfitName ?? "Mi look de StrandIA",
        text: preview.outfitName ? `${preview.outfitName} — vía StrandIA` : "Mi look de StrandIA",
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
        className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-text-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
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
        <span>{loading ? "Generando..." : "Compartir afuera"}</span>
      </button>

      {preview && (
        <StoryCardPreviewModal
          previewUrl={preview.previewUrl}
          outfitName={preview.outfitName}
          canShareNative={canShareFiles(
            new File([preview.blob], preview.fileName, { type: "image/jpeg" })
          )}
          onShare={onShareNative}
          onDownload={onDownload}
          onClose={closePreview}
        />
      )}

      {toast && (
        <Toast message={toast.msg} kind={toast.kind} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
