// Subir una foto de outfit completo (selfie de espejo, cuerpo entero, o
// tendido en la cama) y dejar que Claude Vision detecte cada prenda visible.
// Acepta cámara (1 foto) o galería (multi-select, tope 10). Cada foto se
// procesa secuencialmente — 1 llamada a Vision por foto — y las prendas
// detectadas van a la misma pantalla de revisión de la ráfaga.

"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CameraTipsModal from "@/components/wardrobe/CameraTipsModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { ALLOWED_MIME_TYPES } from "@/lib/wardrobe/constants";
import { extractOutfitPhoto } from "@/lib/wardrobe/outfitExtraction";
import { peekBurstBudgetAction } from "@/app/wardrobe/upload/burstActions";
import { processPendingForUser } from "@/lib/wardrobe/burstQueue";

const MAX_PHOTOS = 10;
const CAMERA_TIPS_KEY = "strandia_camera_tips_seen";

type PhotoResult = { label: string; detail: string; ok: boolean };

export default function OutfitPhotoCapture() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [showCameraTips, setShowCameraTips] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [results, setResults] = useState<PhotoResult[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [trimmedWarning, setTrimmedWarning] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (active && user) setUserId(user.id);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const totalDetected = results.reduce(
    (sum, r) => sum + (r.ok ? Number(r.detail.match(/\d+/)?.[0] ?? 0) : 0),
    0
  );

  async function processFiles(files: File[]) {
    if (!userId || files.length === 0) return;

    setGeneralError(null);
    setResults([]);
    setProcessing(true);

    try {
      const budget = await peekBurstBudgetAction();
      if (budget.remaining < files.length) {
        setTrimmedWarning(
          budget.remaining === 0
            ? `Ya no te quedan análisis esta hora — se procesarán en ~${budget.resetInMinutes} min.`
            : `Solo alcanza el cupo para analizar ${budget.remaining} de tus ${files.length} fotos esta hora; el resto queda para después.`
        );
      } else {
        setTrimmedWarning(null);
      }

      const newResults: PhotoResult[] = [];
      let stopped = false;

      for (let i = 0; i < files.length; i++) {
        if (stopped) break;
        setProgressLabel(`Analizando foto ${i + 1} de ${files.length}…`);
        const result = await extractOutfitPhoto(supabase, userId, files[i]);

        if (result.ok) {
          newResults.push({
            label: `Foto ${i + 1}`,
            detail:
              result.detectedCount === 0
                ? "no encontramos ropa en esta foto"
                : `${result.detectedCount} ${result.detectedCount === 1 ? "prenda detectada" : "prendas detectadas"}`,
            ok: result.detectedCount > 0,
          });
        } else if (result.reason === "rate_limited") {
          newResults.push({
            label: `Foto ${i + 1}`,
            detail: `límite alcanzado — se reintenta en ~${result.resetInMinutes} min`,
            ok: false,
          });
          stopped = true;
        } else {
          newResults.push({ label: `Foto ${i + 1}`, detail: "no pudimos analizarla", ok: false });
        }
        setResults([...newResults]);
      }

      processPendingForUser(supabase, userId).catch(() => {});
    } finally {
      setProcessing(false);
      setProgressLabel(null);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;

    const invalid = selected.some(
      (f) => !ALLOWED_MIME_TYPES.includes(f.type as (typeof ALLOWED_MIME_TYPES)[number])
    );
    if (invalid) {
      setGeneralError("Alguna foto tiene un formato no permitido. Usa JPG, PNG o WebP.");
      return;
    }

    const capped = selected.slice(0, MAX_PHOTOS);
    if (selected.length > MAX_PHOTOS) {
      setTrimmedWarning(`Elegiste ${selected.length} fotos — tomamos las primeras ${MAX_PHOTOS}.`);
    }

    processFiles(capped);
  }

  function handleCameraClick() {
    if (localStorage.getItem(CAMERA_TIPS_KEY)) {
      cameraInputRef.current?.click();
    } else {
      setShowCameraTips(true);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {showCameraTips ? (
        <CameraTipsModal
          onConfirm={() => {
            setShowCameraTips(false);
            cameraInputRef.current?.click();
          }}
          onClose={() => setShowCameraTips(false)}
        />
      ) : null}

      {generalError ? (
        <p role="alert" className="rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
          {generalError}
        </p>
      ) : null}

      {trimmedWarning ? (
        <div role="status" className="rounded-md bg-warning-light px-4 py-3 text-sm font-medium text-warning">
          {trimmedWarning}
        </div>
      ) : null}

      <Card padding="md">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6 12 2 4 6v6c0 5 8 10 8 10s8-5 8-10V6z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-text">
            Sube una foto de tu outfit completo
          </p>
          <p className="max-w-xs text-xs text-text-faint">
            Selfie de espejo, cuerpo entero, o ropa tendida — detectamos cada
            prenda automáticamente. Hasta {MAX_PHOTOS} fotos de galería a la vez.
          </p>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(",")}
          capture="environment"
          className="sr-only"
          onChange={handleFileChange}
          aria-hidden="true"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(",")}
          multiple
          className="sr-only"
          onChange={handleFileChange}
          aria-hidden="true"
        />

        <div className="mt-2 grid grid-cols-2 gap-3">
          <Button
            variant="ghost"
            onClick={handleCameraClick}
            disabled={processing || !userId}
          >
            Cámara
          </Button>
          <Button
            variant="ghost"
            onClick={() => galleryInputRef.current?.click()}
            disabled={processing || !userId}
          >
            Galería
          </Button>
        </div>
      </Card>

      {processing || results.length > 0 ? (
        <Card padding="md">
          {progressLabel ? (
            <div role="status" className="flex items-center gap-2 text-sm font-medium text-primary">
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-hidden="true"
              />
              {progressLabel}
            </div>
          ) : null}

          {results.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {results.map((r, i) => (
                <li key={i} className={r.ok ? "text-text" : "text-text-muted"}>
                  <span className="font-medium">{r.label}:</span> {r.detail}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="ghost" onClick={() => router.push("/wardrobe/upload")} disabled={processing}>
          Volver
        </Button>
        <Button
          onClick={() => router.push("/wardrobe/upload/review")}
          disabled={processing || totalDetected === 0}
        >
          Ver prendas detectadas {totalDetected > 0 ? `(${totalDetected})` : ""}
        </Button>
      </div>
    </div>
  );
}
