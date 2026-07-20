"use client";

import { useEffect, useId, useRef, useState } from "react";
import LazyImage from "@/components/ui/LazyImage";

// Assets intercambiables en /public/camera-tips/ — el set de fotos se
// actualiza reemplazando estos archivos, sin tocar este componente.
// Specs recomendadas: JPG, aspect ratio 3:4 (≈900×1200px), ~150-200KB.
// Si un archivo falta, cada foto cae a un fallback digno (fondo surface +
// el ícono de esa tarjeta) — el modal nunca se ve roto por un asset ausente.
//   ejemplo-ideal.jpg        protagonista: la foto "de catálogo"
//   evita-oscura.jpg         ejemplo de foto oscura / mal iluminada
//   evita-borrosa.jpg        ejemplo de foto borrosa
//   evita-parcial.jpg        ejemplo que solo muestra parte de la prenda
//   evita-fondo-cargado.jpg  ejemplo con fondo desordenado
//   antes.jpg / despues.jpg  antes→después de la reconstrucción con IA
//                            (el bloque solo aparece si AMBOS existen)
const ASSET_BASE = "/camera-tips";
const HERO_SRC = `${ASSET_BASE}/ejemplo-ideal.jpg`;
const ANTES_SRC = `${ASSET_BASE}/antes.jpg`;
const DESPUES_SRC = `${ASSET_BASE}/despues.jpg`;

const HERO_ANNOTATIONS = [
  { icon: "checkroom", label: "Prenda completa", position: "left-3 top-3" },
  { icon: "wb_sunny", label: "Luz natural", position: "right-3 top-3" },
  { icon: "auto_awesome", label: "Fondo limpio", position: "bottom-3 left-3" },
] as const;

const AVOID_ITEMS = [
  { src: `${ASSET_BASE}/evita-oscura.jpg`, icon: "bedtime", caption: "Muy oscura" },
  { src: `${ASSET_BASE}/evita-borrosa.jpg`, icon: "blur_on", caption: "Borrosa" },
  { src: `${ASSET_BASE}/evita-parcial.jpg`, icon: "crop", caption: "Solo una parte" },
  { src: `${ASSET_BASE}/evita-fondo-cargado.jpg`, icon: "wallpaper", caption: "Fondo cargado" },
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [heroFailed, setHeroFailed] = useState(false);
  const antesOk = useImageAvailable(ANTES_SRC);
  const despuesOk = useImageAvailable(DESPUES_SRC);
  const showBeforeAfter = antesOk && despuesOk;

  // Si ya vio los tips antes (o se abrió desde el re-acceso tras haberlos
  // visto), el CTA está listo desde el inicio. Si es la primera vez, el CTA
  // se destraba solo cuando el usuario llega al final del contenido.
  // `initiallySeen` se calcula una sola vez (lazy init) y nunca cambia —
  // sirve tanto para el estado inicial del CTA como para decidir el foco.
  const [initiallySeen] = useState(
    () => typeof window !== "undefined" && Boolean(localStorage.getItem(storageKey))
  );
  const [ctaReady, setCtaReady] = useState(initiallySeen);

  // Primera vez: observa un sentinel al final del contenido — cuando entra
  // en el viewport del scroll interno, destraba el CTA. Se usa
  // IntersectionObserver (no cálculos de scrollHeight) para que funcione
  // igual sin importar cuánto contenido haya (assets faltantes, etc).
  useEffect(() => {
    if (ctaReady) return;
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCtaReady(true);
          observer.disconnect();
        }
      },
      { root, threshold: 0.01 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [ctaReady]);

  // Foco inicial: si el CTA ya está listo, al botón. Si no, al contenido
  // scrolleable (para que usuarios de teclado puedan bajar con flechas/Page
  // Down sin quedar atrapados sin un elemento enfocable).
  useEffect(() => {
    if (initiallySeen) {
      confirmBtnRef.current?.focus();
    } else {
      scrollRef.current?.focus();
    }
  }, [initiallySeen]);

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
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-text-muted backdrop-blur transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="material-symbols-outlined text-xl leading-none" aria-hidden="true">
            close
          </span>
        </button>

        <div
          ref={scrollRef}
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-8 focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        >
          {/* Hebri presenta el tip */}
          <div className="flex items-start gap-3 pr-8">
            <img
              src="/hebri/estados/hebri_feliz.png"
              alt=""
              aria-hidden="true"
              width={84}
              height={84}
              className="pet-sway pet-breathe motion-reduce:!animate-none shrink-0"
            />
            <div className="relative mt-1 rounded-2xl rounded-tl-sm bg-primary-light px-4 py-3">
              <h2 id={titleId} className="font-display text-lg font-semibold leading-snug text-text">
                Un tip antes de la foto
              </h2>
              <p className="mt-0.5 text-sm text-text-muted">
                Con esto te armo mejores outfits.
              </p>
            </div>
          </div>

          {/* Protagonista: la foto ideal */}
          <div className="mt-6">
            <SectionLabel icon="photo_camera" text="La foto ideal se ve así" />
            <div className="relative mt-3 aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-surface-2">
              {heroFailed ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
                    checkroom
                  </span>
                  <p className="text-xs text-text-muted">
                    Prenda completa · luz natural · fondo limpio
                  </p>
                </div>
              ) : (
                <>
                  <LazyImage
                    src={HERO_SRC}
                    alt="Ejemplo de foto ideal: prenda completa, con luz natural y fondo limpio"
                    className="h-full w-full object-cover"
                    onError={() => setHeroFailed(true)}
                  />
                  {HERO_ANNOTATIONS.map((tag) => (
                    <span
                      key={tag.label}
                      className={`absolute ${tag.position} inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold text-text shadow-md backdrop-blur`}
                    >
                      <span className="material-symbols-outlined text-sm leading-none text-primary" aria-hidden="true">
                        {tag.icon}
                      </span>
                      {tag.label}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Secundario: evita esto */}
          <div className="mt-6">
            <SectionLabel icon="close" text="Evita esto" tone="danger" />
            <div className="mt-3 grid grid-cols-4 gap-3">
              {AVOID_ITEMS.map((item) => (
                <AvoidThumb key={item.src} {...item} />
              ))}
            </div>
          </div>

          {/* Cierre motivacional: antes → después, solo si ambos assets existen */}
          {showBeforeAfter ? (
            <div className="mt-6 rounded-xl border border-border bg-primary-light/50 p-4">
              <p className="text-sm font-semibold text-text">
                ¿No te quedó perfecta? Tranquilo.
              </p>
              <div className="mt-3 flex items-center gap-2.5">
                <div className="aspect-square flex-1 overflow-hidden rounded-lg border border-border bg-surface-2">
                  <LazyImage
                    src={ANTES_SRC}
                    alt="Foto original, tal como la tomó el usuario"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="material-symbols-outlined shrink-0 text-xl text-primary" aria-hidden="true">
                  arrow_forward
                </span>
                <div className="aspect-square flex-1 overflow-hidden rounded-lg border border-border bg-surface-2">
                  <LazyImage
                    src={DESPUES_SRC}
                    alt="La misma prenda reconstruida por la IA, lista para el armario"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-text-muted">
                La reconstruimos con IA — tu foto se convierte en foto de catálogo.
              </p>
            </div>
          ) : null}

          {/* Sentinel: cuando entra en el viewport del scroll, el CTA se destraba. */}
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        </div>

        {/* Footer fijo — nunca oculta el contenido; antes de scrollear hasta
            el final (primera vez) muestra un indicador en vez del CTA. */}
        <div className="border-t border-border bg-surface-2 px-6 py-4">
          {ctaReady ? (
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={handleConfirm}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow-md hover:-translate-y-px active:translate-y-0 active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:animate-[fadeIn_200ms_ease-out]"
            >
              <span className="material-symbols-outlined text-base leading-none" aria-hidden="true">
                photo_camera
              </span>
              Entendido, tomar foto
            </button>
          ) : (
            <div className="flex flex-col items-center gap-0.5 py-1.5 text-text-muted motion-safe:animate-[fadeIn_200ms_ease-out]">
              <span className="text-xs font-medium">Desliza para ver los tips</span>
              <span
                className="material-symbols-outlined motion-safe:animate-[chevronHint_1.6s_ease-in-out_infinite] text-xl leading-none"
                aria-hidden="true"
              >
                expand_more
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponentes internos
// ---------------------------------------------------------------------------

function SectionLabel({
  icon,
  text,
  tone = "primary",
}: {
  icon: string;
  text: string;
  tone?: "primary" | "danger";
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${
          tone === "danger" ? "bg-danger" : "bg-primary"
        }`}
      >
        <span className="material-symbols-outlined text-sm leading-none" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="text-sm font-semibold text-text">{text}</p>
    </div>
  );
}

function AvoidThumb({
  src,
  icon,
  caption,
}: {
  src: string;
  icon: string;
  caption: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface-2">
        {failed ? (
          <div className="flex h-full w-full items-center justify-center">
            <span className="material-symbols-outlined text-xl text-text-faint" aria-hidden="true">
              {icon}
            </span>
          </div>
        ) : (
          <LazyImage
            src={src}
            alt={`Ejemplo a evitar: foto ${caption.toLowerCase()}`}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        )}
        <span
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white shadow-sm"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[13px] leading-none">close</span>
        </span>
      </div>
      <p className="mt-1.5 text-center text-[11px] leading-tight text-text-muted">{caption}</p>
    </div>
  );
}

/** true una vez que `src` se confirma cargable; se queda en false si falta o falla. */
function useImageAvailable(src: string): boolean {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;
    const img = new window.Image();
    img.onload = () => { if (alive) setOk(true); };
    img.onerror = () => { if (alive) setOk(false); };
    img.src = src;
    return () => { alive = false; };
  }, [src]);

  return ok;
}
