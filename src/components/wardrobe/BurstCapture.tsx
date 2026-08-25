// Modo ráfaga: capturar muchas fotos seguidas sin pantallas intermedias.
// Cada foto se sube cruda a Storage y entra a la cola de procesamiento en
// background (burstQueue.ts) — Claude Vision + Gemini corren mientras el
// usuario sigue tomando fotos. La revisión/confirmación pasa a
// /wardrobe/upload/review.

"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CameraTipsModal from "@/components/wardrobe/CameraTipsModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { downscaleToMaxPx, CAMERA_DOWNSCALE_MAX_PX } from "@/lib/wardrobe/imageUtils";
import { ALLOWED_MIME_TYPES } from "@/lib/wardrobe/constants";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { peekBurstBudgetAction } from "@/app/wardrobe/upload/burstActions";
import {
  cleanupStaleDrafts,
  enqueueDraftPhoto,
  fetchPendingItems,
  processPendingForUser,
  resumeStuckProcessing,
} from "@/lib/wardrobe/burstQueue";

const CAMERA_TIPS_KEY_PREFIX = "strandia_camera_tips_seen";

type FlyingThumb = { key: number; src: string };

export default function BurstCapture() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const previewImgRef = useRef<HTMLDivElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [showCameraTips, setShowCameraTips] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [lastThumb, setLastThumb] = useState<string | null>(null);
  const [flyingThumb, setFlyingThumb] = useState<FlyingThumb | null>(null);
  const [uploading, setUploading] = useState(false);
  // "Listo" consulta el presupuesto contra el servidor y luego navega a una
  // ruta con Server Components. Los dos pasos tardan, y sin este estado el
  // botón se quedaba inerte: el usuario lo pulsaba una y otra vez creyendo
  // que no había registrado el toque.
  const [abriendoRevision, setAbriendoRevision] = useState(false);
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [supabase] = useState(() => createSupabaseBrowserClient());
  const online = useOnlineStatus();
  // Defensa en profundidad, NO el fix: el candado real es el claim atómico
  // en burstQueue.ts (UPDATE ... WHERE status='draft'). Esto solo evita
  // lanzar una pasada completa de `processPendingForUser` si ya hay una en
  // vuelo disparada por esta misma pestaña — reduce el ruido de invocaciones
  // solapadas, pero otra pestaña/pantalla puede solaparse igual y el claim
  // atómico es lo que evita que eso duplique trabajo.
  const processingRef = useRef(false);
  // Se levanta al desmontar. Lo lee `shouldStop` para que la cola no siga
  // tomando items nuevos desde una pantalla que el usuario ya abandonó — ver
  // la nota larga en BurstQueueCallbacks.shouldStop.
  const unmountedRef = useRef(false);
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const refreshQueueCount = useCallback(async () => {
    if (!userId) return;
    try {
      const pending = await fetchPendingItems(supabase, userId);
      setQueueCount(pending.filter((i) => i.status !== "confirmed").length);
    } catch {
      // Contador de cola: si la consulta falla, se DEJA el último valor bueno.
      // Ponerlo en 0 diría "no tienes nada esperando" sobre fotos que sí están
      // en cola. Se corrige solo en la próxima llamada (cada onItemChange, y
      // al volver la señal).
    }
  }, [supabase, userId]);

  const runQueue = useCallback(
    (uid: string) => {
      if (processingRef.current) return;
      // Offline: no arrancamos el pipeline solo para que queme el reintento
      // contra una conexión caída. Se retoma cuando ReviewGrid haga polling
      // (o esta misma pantalla vuelva a llamar runQueue) con conexión de vuelta.
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      processingRef.current = true;
      processPendingForUser(supabase, uid, {
        shouldStop: () => unmountedRef.current,
        onItemChange: () => refreshQueueCount(),
        onBudgetExceeded: (resetInMinutes) =>
          setBudgetWarning(
            `Llegaste al límite de análisis de esta hora. El resto se procesará en ~${resetInMinutes} min.`
          ),
      })
        .catch(() => {})
        .finally(() => {
          processingRef.current = false;
        });
    },
    [supabase, refreshQueueCount]
  );

  // ── Inicialización: usuario, retomar procesamiento a medias, limpiar drafts viejos ──
  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user) return;
      setUserId(user.id);

      await resumeStuckProcessing(supabase, user.id);
      await cleanupStaleDrafts(supabase, user.id);

      try {
        const pending = await fetchPendingItems(supabase, user.id);
        setQueueCount(pending.filter((i) => i.status !== "confirmed").length);
      } catch {
        // Arranque con la consulta caída: el contador se queda en 0 porque no
        // sabemos nada todavía, pero la cola SÍ se arranca igual — lo que haya
        // pendiente se procesa, y el contador se corrige en el primer
        // onItemChange.
      }

      // Sigue procesando lo que haya quedado pendiente de una sesión anterior.
      runQueue(user.id);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Retoma la cola apenas vuelve la señal — esta pantalla no tiene polling
  // propio (a diferencia de ReviewGrid), así que sin esto un draft que quedó
  // pendiente por caída de red no se procesa hasta la próxima foto o hasta
  // que el usuario pase a la revisión.
  useEffect(() => {
    if (online && userId) runQueue(userId);
  }, [online, userId, runQueue]);

  function flyThumbToCounter(srcUrl: string) {
    const badgeEl = badgeRef.current;
    const previewEl = previewImgRef.current;
    if (!badgeEl || !previewEl) return;

    const badgeRect = badgeEl.getBoundingClientRect();
    const previewRect = previewEl.getBoundingClientRect();
    const dx = badgeRect.left + badgeRect.width / 2 - (previewRect.left + previewRect.width / 2);
    const dy = badgeRect.top + badgeRect.height / 2 - (previewRect.top + previewRect.height / 2);

    const key = Date.now();
    setFlyingThumb({ key, src: srcUrl });
    // Limpieza tras la animación (300ms) — coherente con el timing de fadeInUp/scaleIn.
    setTimeout(() => setFlyingThumb((cur) => (cur?.key === key ? null : cur)), 320);

    requestAnimationFrame(() => {
      const el = document.getElementById(`fly-thumb-${key}`);
      if (el) {
        el.style.setProperty("--fly-x", `${dx}px`);
        el.style.setProperty("--fly-y", `${dy}px`);
      }
    });
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setGeneralError(null);
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected || !userId) return;

    if (!ALLOWED_MIME_TYPES.includes(selected.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      setGeneralError("Formato no permitido. Usa JPG, PNG o WebP.");
      return;
    }

    setUploading(true);
    try {
      const workingFile = await downscaleToMaxPx(selected, CAMERA_DOWNSCALE_MAX_PX).catch(
        () => selected
      );
      const objectUrl = URL.createObjectURL(workingFile);
      setLastThumb(objectUrl);
      flyThumbToCounter(objectUrl);

      const inserted = await enqueueDraftPhoto(supabase, userId, workingFile);
      if (!inserted) {
        setGeneralError("No pudimos guardar esa foto. Intenta de nuevo.");
        return;
      }

      setQueueCount((n) => n + 1);

      // Fire and forget: procesa en background mientras el usuario sigue.
      runQueue(userId);

      // Intento de reabrir la cámara sin que el usuario tenga que tocar de
      // nuevo el botón. Algunos navegadores (sobre todo iOS Safari) bloquean
      // el .click() programático fuera del gesto original — si eso pasa, el
      // botón "Tomar otra foto" sigue disponible como fallback.
      cameraInputRef.current?.click();
    } finally {
      setUploading(false);
    }
  }

  function handleCameraClick() {
    if (userId && localStorage.getItem(`${CAMERA_TIPS_KEY_PREFIX}:${userId}`)) {
      cameraInputRef.current?.click();
    } else {
      setShowCameraTips(true);
    }
  }

  async function handleListo() {
    // El estado se levanta ANTES del primer await: es lo único que separa
    // "pulsé y está trabajando" de "pulsé y no pasó nada". También hace de
    // candado contra el doble toque, que era la reacción natural al silencio.
    if (abriendoRevision) return;
    setAbriendoRevision(true);

    try {
      if (userId) {
        const budget = await peekBurstBudgetAction();
        if (budget.remaining === 0 && budget.resetInMinutes) {
          setBudgetWarning(
            `Ya no te quedan análisis esta hora. Las fotos en cola se procesarán en ~${budget.resetInMinutes} min — puedes revisar las que ya están listas.`
          );
        }
      }
      // No se reinicia `abriendoRevision` en el camino feliz: la navegación
      // tarda y el componente sigue montado mientras tanto. Apagarlo aquí
      // devolvería el botón a su estado normal justo antes de que la pantalla
      // cambie, que es el parpadeo que este arreglo viene a quitar.
      router.push("/wardrobe/upload/review");
    } catch {
      setGeneralError("No pudimos abrir la revisión. Intenta de nuevo.");
      setAbriendoRevision(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {showCameraTips && userId ? (
        <CameraTipsModal
          storageKey={`${CAMERA_TIPS_KEY_PREFIX}:${userId}`}
          onConfirm={() => {
            setShowCameraTips(false);
            cameraInputRef.current?.click();
          }}
          onClose={() => setShowCameraTips(false)}
        />
      ) : null}

      {!online ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md bg-warning-light px-4 py-3 text-sm font-medium text-warning motion-safe:animate-[fadeInUp_180ms_ease-out]"
        >
          <span className="material-symbols-outlined text-base leading-none" aria-hidden="true">
            wifi_off
          </span>
          Sin conexión — no vamos a poder guardar las fotos que tomes hasta que vuelva la señal.
        </div>
      ) : null}

      {budgetWarning ? (
        <div
          role="status"
          className="rounded-md bg-warning-light px-4 py-3 text-sm font-medium text-warning motion-safe:animate-[fadeInUp_180ms_ease-out]"
        >
          {budgetWarning}
        </div>
      ) : null}

      {generalError ? (
        <p role="alert" className="rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
          {generalError}
        </p>
      ) : null}

      <Card padding="sm">
        <div
          ref={previewImgRef}
          className="relative aspect-[4/5] overflow-hidden rounded-lg border-2 border-dashed border-border bg-surface-2"
        >
          {lastThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lastThumb}
              alt="Última foto capturada"
              className="h-full w-full object-cover transition-opacity duration-300"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 7h4l2-3h6l2 3h4v12H3z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-text">Captura tus prendas una tras otra</p>
              <p className="text-xs text-text-faint">
                Sin pausas — analizamos todo en segundo plano mientras sigues fotografiando.
              </p>
            </div>
          )}

          {/* Contador de fotos en cola */}
          <div
            ref={badgeRef}
            className="absolute right-3 top-3 flex h-9 min-w-9 items-center justify-center rounded-full bg-primary px-2 text-sm font-bold text-white shadow-md"
            aria-label={`${queueCount} fotos en cola`}
          >
            {queueCount}
          </div>

          {/* Thumbnail volando al contador */}
          {flyingThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              id={`fly-thumb-${flyingThumb.key}`}
              src={flyingThumb.src}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-12 -translate-x-1/2 -translate-y-1/2 rounded-md object-cover shadow-md motion-safe:animate-[flyToCorner_300ms_ease-in]"
            />
          ) : null}
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

        <div className="mt-4 flex flex-col gap-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleCameraClick}
            isLoading={uploading}
            loadingText="Guardando…"
            leftIcon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 7h4l2-3h6l2 3h4v12H3z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            }
          >
            {lastThumb ? "Tomar otra foto" : "Tomar foto"}
          </Button>

          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={handleListo}
            disabled={queueCount === 0}
            isLoading={abriendoRevision}
            loadingText="Preparando tus prendas…"
            leftIcon={
              abriendoRevision ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
                />
              ) : undefined
            }
          >
            Listo {queueCount > 0 ? `(${queueCount})` : ""}
          </Button>

          <button
            type="button"
            onClick={() => setShowCameraTips(true)}
            className="mx-auto flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-text-muted transition-colors duration-150 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="material-symbols-outlined text-sm leading-none" aria-hidden="true">
              help
            </span>
            Tips para la foto
          </button>
        </div>
      </Card>
    </div>
  );
}
