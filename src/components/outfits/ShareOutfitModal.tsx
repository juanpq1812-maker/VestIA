// Modal "¿Compartes esta foto con la comunidad?" — aparece justo después de
// registrar un uso ("Lo usé hoy"/"otro día") en SavedOutfitCard.
//
// Requiere una FOTO REAL (nunca el moodboard/miniaturas de prendas): así
// nunca se expone el bucket privado `clothing-images` entre usuarios. La
// captura usa <input type="file" capture="environment"> — dispara la cámara
// nativa en mobile, cae a file picker en desktop, sin getUserMedia.
//
// La subida a Storage ocurre acá mismo, en el cliente (mismo patrón que
// UploadForm.tsx para prendas) — el servidor solo recibe el path ya subido.

"use client";

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import {
  COMMUNITY_SHARES_BUCKET,
  buildCommunitySharePath,
} from "@/lib/storage/communityShares";
import { shareOutfitAction } from "@/lib/community/actions";
import {
  downscaleToMaxPx,
  OUTFIT_PHOTO_MAX_PX,
  readImageDimensions,
  MIN_SHARE_PHOTO_DIMENSION_PX,
} from "@/lib/wardrobe/imageUtils";

type Props = {
  outfitId: string;
  outfitUseId: string;
  onShared: () => void;
  onClose: () => void;
};

export default function ShareOutfitModal({
  outfitId,
  outfitUseId,
  onShared,
  onClose,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function onCompartir() {
    if (!file) {
      setError("Elige o toma una foto para compartir.");
      return;
    }
    setEnviando(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEnviando(false);
      setError("Sesión expirada. Recarga la página e intenta de nuevo.");
      return;
    }

    // Piso de calidad: rechaza fotos sospechosamente chicas (ícono,
    // thumbnail accidental, captura fallida) antes de subir nada — no ataja
    // un caso puntual, es una red mínima para cualquier subida futura.
    try {
      const { width, height } = await readImageDimensions(file);
      if (Math.min(width, height) < MIN_SHARE_PHOTO_DIMENSION_PX) {
        setEnviando(false);
        setError("Esa imagen es muy pequeña para compartirse. Elige una foto real del look.");
        return;
      }
    } catch {
      setEnviando(false);
      setError("No pudimos leer esa imagen. Prueba con otra foto.");
      return;
    }

    // Normalizamos a JPEG vía canvas antes de subir — la cámara nativa de
    // iOS puede capturar en HEIC, que Safari previsualiza localmente (decodifica
    // a nivel de OS) pero que otros navegadores no pueden renderizar en <img>.
    // Sin esto, el share queda "roto" (rectángulo sólido) para cualquiera que
    // no use Safari. Mismo patrón que UploadForm.tsx para prendas.
    let toUpload: File;
    try {
      toUpload = await downscaleToMaxPx(file, OUTFIT_PHOTO_MAX_PX);
    } catch {
      setEnviando(false);
      setError("No pudimos procesar esa foto. Prueba con otra.");
      return;
    }

    const uuid = crypto.randomUUID();
    const path = buildCommunitySharePath({ userId: user.id, fileName: toUpload.name, uuid });

    const { error: uploadError } = await supabase.storage
      .from(COMMUNITY_SHARES_BUCKET)
      .upload(path, toUpload, { contentType: toUpload.type, upsert: false });

    if (uploadError) {
      setEnviando(false);
      setError(`No pudimos subir la foto: ${uploadError.message}.`);
      return;
    }

    const res = await shareOutfitAction({
      outfitId,
      outfitUseId,
      photoPath: path,
      caption: caption.trim() || null,
    });

    if (!res.ok) {
      await supabase.storage.from(COMMUNITY_SHARES_BUCKET).remove([path]).catch(() => {});
      setEnviando(false);
      setError(res.error);
      return;
    }

    setEnviando(false);
    onShared();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-outfit-modal-title"
      className="fixed inset-0 z-40 flex items-end justify-center bg-text/40 p-4 sm:items-center"
      style={{ animation: "fadeIn 160ms ease-out" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !enviando) onClose();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <header className="border-b border-border px-5 py-4">
          <h2 id="share-outfit-modal-title" className="font-display text-xl font-semibold text-text">
            ¿Compartes este look?
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Toma o sube una foto real con el outfit puesto — se suma a tu perfil de
            Comunidad.
          </p>
        </header>

        <div className="p-5">
          {previewUrl ? (
            <div className="relative mx-auto aspect-[3/4] w-40 overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Vista previa" className="h-full w-full object-cover" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-[3/4] w-40 mx-auto flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-2 text-text-muted transition-colors hover:border-primary-mid hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8a2 2 0 0 1 2-2h1l1.5-2h7L17 6h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              <span className="text-xs font-semibold">Tomar / subir foto</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            className="hidden"
          />

          {previewUrl && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mx-auto mt-2 block text-xs font-semibold text-primary hover:underline"
            >
              Cambiar foto
            </button>
          )}

          <label className="mt-4 block text-sm font-semibold text-text" htmlFor="share-caption">
            Comentario (opcional)
          </label>
          <textarea
            id="share-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="¿Para qué ocasión usaste este look?"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
          />

          {error && (
            <p role="alert" className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={enviando} type="button">
            No, gracias
          </Button>
          <Button
            variant="primary"
            onClick={onCompartir}
            disabled={!file || enviando}
            isLoading={enviando}
            loadingText="Compartiendo..."
            type="button"
          >
            Compartir foto
          </Button>
        </footer>
      </div>
    </div>
  );
}
