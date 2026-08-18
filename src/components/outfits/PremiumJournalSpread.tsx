// Cuaderno de 2 páginas (Premium): un solo objeto Style Journal — no dos
// tarjetas — donde pasar de un outfit a otro es un volteo de página 3D
// real (la hoja se levanta, gira sobre el espiral y revela la siguiente),
// no un scroll horizontal. Reemplaza, para Premium, el carrusel de
// OutfitCard de ResultsGrid (que sigue existiendo tal cual para Free, ver
// OutfitGenerator.tsx — ese camino sigue usando useSnapPager sin cambios,
// este componente ya NO lo usa).
//
// Geometría del volteo (de atrás hacia adelante, ver capas abajo):
//   z=0  fondo base (papel + espiral + sombra), estático.
//   z=10 página 2, estática — contenido solo, se apoya en el papel de z=0.
//   z=20/5 (dinámico) la TARJETA que voltea — lleva su propia copia de
//        cuaderno.svg (para ser opaca mientras cubre la página 2) + el
//        contenido del outfit 1 en la cara frontal, y el papel en blanco
//        (sin contenido, sin espiral) en la cara trasera. Ambas caras
//        comparten transform-origin: left center (el eje es el espiral) y
//        rotan JUNTAS porque el rotateY vive en la tarjeta (el padre), no
//        en cada cara — así no hay que sincronizar dos transforms.
//   z=30 espiral recortado (clip-path a la franja del arte donde vive,
//        x=34–66 del viewBox), estático, SIEMPRE encima — para que la hoja
//        pase por detrás de los anillos en vez de por encima.
//
// Botones (Guardar / Lo usaré hoy / Compartir / No me convence) siguen
// afuera del objeto cuaderno — ver la justificación en el plan de este
// cambio: es una pieza visual, no un panel de control, y una fila fija que
// solo cambia de texto al voltear es más legible que botones que giran con
// la hoja.

"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import OutfitFeedbackSheet from "@/components/outfits/OutfitFeedbackSheet";
import StyleJournalPage from "@/components/outfits/StyleJournalPage";
import ShareStyleJournalButton from "@/components/outfits/ShareStyleJournalButton";
import {
  saveOutfitAction,
  registerOutfitUseAction,
  saveAndUseOutfitTodayAction,
} from "@/app/outfits/actions";
import type { GenerateMode, GeneratedOutfit } from "@/lib/ai/generateOutfits";
import { vx } from "@/lib/outfits/styleJournalLayout";
import { runFlipTween, shadowOpacityForAngle } from "@/lib/outfits/pageFlipTween";
import type { CardEstado } from "@/components/outfits/OutfitGenerator";

type Props = {
  outfits: GeneratedOutfit[];
  onRegenerate: () => void;
  contextoOcasion: string | null;
  modo: GenerateMode;
  onToast: (msg: string, kind: "success" | "error") => void;
};

// Overlay de sombra: mismo gradiente para ambas caras, solo cambia su
// opacidad (ver shadowOpacityForAngle). El "pliegue" siempre cae del lado
// del espiral (izquierda), sin importar cuál cara esté visible.
const SHADOW_GRADIENT = "linear-gradient(to right, rgba(0,0,0,0.45), transparent 55%)";

// Franja del arte donde vive el espiral, en % del lienzo (viewBox 0-400) —
// ver el comentario de CONTENT_LEFT en styleJournalLayout.ts. Recorta la
// segunda copia de cuaderno.svg a solo esa franja para la capa z=30.
const SPIRAL_CLIP_PATH = `inset(0 ${100 - vx(66)}% 0 ${vx(34)}%)`;

function angleForPage(idx: 0 | 1): number {
  return idx === 0 ? 0 : -180;
}

// Umbral de dirección: por debajo de esto en ambos ejes, un pointerdown
// todavía no se decidió como gesto horizontal (voltear) ni vertical
// (scroll de la página) — se espera al siguiente move.
const DIRECTION_THRESHOLD_PX = 8;

// Umbral de distancia para completar el volteo al soltar: fracción del
// recorrido total (180°) que hay que haber recorrido en NETO desde donde
// arrancó el gesto. 50% (el estándar de "carrusel") resultó demasiado
// exigente para un volteo de página en mobile — medio ancho de pantalla de
// arrastre se siente pesado. 28% deja completar con un gesto más corto,
// sin que un roce accidental dispare el volteo.
const DISTANCE_THRESHOLD_RATIO = 0.28;

// Umbral de velocidad: un flick corto y rápido completa el volteo aunque
// no haya llegado al umbral de distancia — así se siente como pasar una
// página real, no como arrastrar una barra hasta el final. Medido en
// px/ms del puntero en el momento de soltar (ver velocityFromSamples).
const VELOCITY_THRESHOLD_PX_MS = 0.4;

// Cuántas muestras recientes de posición se guardan para calcular la
// velocidad al soltar — 3 alcanza para promediar sin arrastrar ruido de
// muestras viejas si el usuario hizo una pausa a mitad del gesto.
const VELOCITY_SAMPLE_WINDOW = 3;

type PointerSample = { t: number; x: number };

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  baseAngle: number;
  committed: boolean; // ya se decidió que es un gesto horizontal
  aborted: boolean; // ya se decidió que es vertical — se le cede el scroll nativo
  lastAngle: number;
  samples: PointerSample[]; // últimas posiciones, para la velocidad al soltar
};

/** Velocidad neta (px/ms, con signo) entre la primera y la última muestra
 * de la ventana — no el desplazamiento total desde pointerdown, que
 * promediaría de más un gesto que empezó lento y terminó en flick. */
function velocityFromSamples(samples: PointerSample[]): number {
  if (samples.length < 2) return 0;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return (last.x - first.x) / dt;
}

export default function PremiumJournalSpread({
  outfits,
  onRegenerate,
  contextoOcasion,
  modo,
  onToast,
}: Props) {
  const [pageIdx, setPageIdx] = useState<0 | 1>(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const frontShadowRef = useRef<HTMLDivElement>(null);
  const backShadowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const cancelTweenRef = useRef<(() => void) | null>(null);

  // Escribe ángulo + sombra DIRECTO al DOM vía refs — nunca por React
  // state mientras gira (ni durante el arrastre ni durante el tween), para
  // que no haya un re-render de por medio comiéndose frames. React solo se
  // entera cuando el volteo termina (setPageIdx en onDone).
  function applyAngle(angle: number) {
    if (cardRef.current) cardRef.current.style.transform = `rotateY(${angle}deg)`;
    const shadow = shadowOpacityForAngle(angle);
    if (frontShadowRef.current) frontShadowRef.current.style.opacity = String(shadow);
    if (backShadowRef.current) backShadowRef.current.style.opacity = String(shadow);
  }

  function flipTo(target: 0 | 1, fromAngle?: number) {
    cancelTweenRef.current?.();
    const from = fromAngle ?? angleForPage(pageIdx);
    const to = angleForPage(target);

    if (from === to) {
      applyAngle(to);
      return;
    }

    setChromeVisible(false);
    setIsAnimating(true);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      applyAngle(to);
      setPageIdx(target);
      setIsAnimating(false);
      setChromeVisible(true);
      return;
    }

    cancelTweenRef.current = runFlipTween({
      from,
      to,
      onFrame: applyAngle,
      onDone: () => {
        setPageIdx(target);
        setIsAnimating(false);
        setChromeVisible(true);
      },
    });
  }

  // Hint de primer render: un nudge chico (voltea ~14° y vuelve) para
  // comunicar que la hoja se puede voltear — mismo lenguaje que el hint de
  // "asomar" que ya usaba el carrusel de tarjetas, adaptado al volteo.
  // Nunca con reduced-motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => {
      cancelTweenRef.current = runFlipTween({
        from: 0,
        to: -14,
        duration: 260,
        onFrame: applyAngle,
        onDone: () => {
          cancelTweenRef.current = runFlipTween({
            from: -14,
            to: 0,
            duration: 260,
            onFrame: applyAngle,
            onDone: () => {},
          });
        },
      });
    }, 500);
    return () => {
      clearTimeout(t);
      cancelTweenRef.current?.();
    };
  }, []);

  // ── Gesto: Pointer Events, no touch — unifica mouse/touch/pen. ─────────
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (isAnimating) return; // no interrumpir un volteo ya en curso
    cancelTweenRef.current?.();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseAngle: angleForPage(pageIdx),
      committed: false,
      aborted: false,
      lastAngle: angleForPage(pageIdx),
      samples: [{ t: performance.now(), x: e.clientX }],
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.aborted || e.pointerId !== drag.pointerId) return;
    const deltaX = e.clientX - drag.startX;
    const deltaY = e.clientY - drag.startY;

    if (!drag.committed) {
      if (Math.abs(deltaX) < DIRECTION_THRESHOLD_PX && Math.abs(deltaY) < DIRECTION_THRESHOLD_PX) {
        return; // todavía no hay suficiente movimiento para decidir la dirección
      }
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        drag.aborted = true; // gesto vertical: se lo cedemos al scroll nativo de la página
        return;
      }
      drag.committed = true;
      frameRef.current?.setPointerCapture(drag.pointerId);
    }

    // Ya confirmado horizontal — evita que el navegador intente además su
    // propio pan horizontal (touch-action: pan-y solo permite el vertical).
    e.preventDefault();

    const width = frameRef.current?.offsetWidth || 1;
    const deltaAngle = (deltaX / width) * 180;
    const angle = Math.max(-180, Math.min(0, drag.baseAngle + deltaAngle));
    drag.lastAngle = angle;
    applyAngle(angle);

    drag.samples.push({ t: performance.now(), x: e.clientX });
    if (drag.samples.length > VELOCITY_SAMPLE_WINDOW) drag.samples.shift();
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    if (!drag.committed || drag.aborted) return; // nunca fue un gesto horizontal

    // Página de origen y "hacia adelante" en términos de este gesto —
    // baseAngle es 0 (viniendo de la página 1) o -180 (viniendo de la 2).
    const startedAtZero = drag.baseAngle === 0;
    const otherPage: 0 | 1 = startedAtZero ? 1 : 0;
    const samePage: 0 | 1 = startedAtZero ? 0 : 1;

    // Umbral de distancia: neto recorrido desde donde arrancó el gesto,
    // sin importar el camino (si volvió sobre sus pasos, cuenta el neto).
    const traveled = Math.abs(drag.lastAngle - drag.baseAngle);
    const passedDistance = traveled >= 180 * DISTANCE_THRESHOLD_RATIO;

    // Umbral de velocidad: un flick corto y rápido en la dirección
    // correcta completa el volteo aunque no haya llegado muy lejos.
    // Arrastrar hacia la izquierda (deltaX negativo) avanza desde la
    // página 1; hacia la derecha, vuelve desde la página 2.
    const velocity = velocityFromSamples(drag.samples);
    const movingForward = startedAtZero ? velocity < 0 : velocity > 0;
    const passedVelocity = Math.abs(velocity) >= VELOCITY_THRESHOLD_PX_MS && movingForward;

    const target: 0 | 1 = passedDistance || passedVelocity ? otherPage : samePage;
    flipTo(target, drag.lastAngle);
  }

  const [estados, setEstados] = useState<CardEstado[]>(() => outfits.map(() => "idle"));
  const [outfitIds, setOutfitIds] = useState<(string | null)[]>(() => outfits.map(() => null));
  const [errMsgs, setErrMsgs] = useState<(string | null)[]>(() => outfits.map(() => null));
  // Id sintético estable por outfit — solo para el nombre del archivo que
  // exporta ShareStyleJournalButton (no toca la DB): un outfit recién
  // generado no tiene id real hasta que se guarda, y compartir no debería
  // esperar a que el usuario guarde primero. Si el outfit SÍ se guarda,
  // se prefiere su id real (más estable si el usuario comparte de nuevo).
  const [syntheticIds] = useState<string[]>(() => outfits.map(() => crypto.randomUUID()));
  const [feedbackAbierto, setFeedbackAbierto] = useState(false);

  function setEstado(idx: number, estado: CardEstado) {
    setEstados((prev) => prev.map((e, i) => (i === idx ? estado : e)));
  }
  function setOutfitId(idx: number, id: string) {
    setOutfitIds((prev) => prev.map((v, i) => (i === idx ? id : v)));
  }
  function setErrMsg(idx: number, msg: string | null) {
    setErrMsgs((prev) => prev.map((v, i) => (i === idx ? msg : v)));
  }

  async function onGuardar(idx: number) {
    const outfit = outfits[idx];
    setEstado(idx, "saving");
    setErrMsg(idx, null);
    const res = await saveOutfitAction({
      name: outfit.name,
      occasion: contextoOcasion,
      notes: outfit.explanation || null,
      clothing_item_ids: outfit.items.map((i) => i.id),
    });
    if (res.ok) {
      setOutfitId(idx, res.outfitId);
      setEstado(idx, "saved");
      onToast("Outfit guardado", "success");
    } else {
      setEstado(idx, "error");
      setErrMsg(idx, res.error);
      onToast(res.error, "error");
    }
  }

  async function onUsarHoy(idx: number) {
    const outfit = outfits[idx];
    const outfitId = outfitIds[idx];
    setEstado(idx, "usingToday");
    setErrMsg(idx, null);

    // Caso B: ya está guardado, solo registramos uso.
    if (outfitId) {
      const res = await registerOutfitUseAction({ outfitId, daysAgo: 0 });
      if (res.ok) {
        setEstado(idx, "usedToday");
        onToast("¡Registrado! Lo usaste hoy", "success");
      } else if (res.code === "ALREADY_REGISTERED") {
        setEstado(idx, "usedToday");
        onToast("Ya habias registrado este outfit hoy", "success");
      } else {
        setEstado(idx, "saved");
        setErrMsg(idx, res.error);
        onToast(res.error, "error");
      }
      return;
    }

    // Caso A: no guardado todavía. Guardamos y registramos uso de hoy.
    const res = await saveAndUseOutfitTodayAction({
      name: outfit.name,
      occasion: contextoOcasion,
      notes: outfit.explanation || null,
      clothing_item_ids: outfit.items.map((i) => i.id),
    });

    if (res.ok === true) {
      setOutfitId(idx, res.outfitId);
      setEstado(idx, "usedToday");
      onToast("¡Registrado! Lo usaste hoy", "success");
    } else if (res.ok === "partial") {
      setOutfitId(idx, res.outfitId);
      setEstado(idx, "saved");
      setErrMsg(idx, res.error);
      onToast(res.error, "error");
    } else {
      setEstado(idx, "error");
      setErrMsg(idx, res.error);
      onToast(res.error, "error");
    }
  }

  const shown = outfits[pageIdx];
  const estado = estados[pageIdx];
  const errMsg = errMsgs[pageIdx];
  const yaGuardado = estado === "saved" || estado === "usedToday";
  const usadoHoy = estado === "usedToday";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-14">
      <header
        className="flex items-start justify-between gap-3 transition-opacity duration-150"
        style={{ opacity: chromeVisible ? 1 : 0 }}
      >
        <h3 className="font-display text-xl text-text">{shown.name}</h3>
        <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          IA
        </span>
      </header>

      {/* Marco del cuaderno — overflow-hidden recorta la hoja limpio
          cuando pasa del canto hacia la izquierda durante el volteo. */}
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-2xl shadow-lg"
        style={{
          perspective: "1200px",
          WebkitPerspective: "1200px",
          touchAction: "pan-y",
        }}
      >
        {/* z=0 — fondo base: papel + espiral + sombra, estático. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cuaderno.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Escena 3D compartida: página 2 y la tarjeta que voltea viven
            DENTRO del mismo transform-style: preserve-3d, y su orden se
            resuelve por profundidad real (translateZ), no por z-index.
            z-index entre un hermano 3D-transformado (la tarjeta) y uno
            plano (la página 2) es exactamente el patrón que Safari/iOS
            resuelve mal — medido: la página 2 se transparentaba a través
            de la 1 en iPhone real aunque en Chrome desktop se veía bien.
            Empujar la página 2 un poco atrás en profundidad real (en vez
            de solo "z-index más bajo") es la técnica estándar para volteos
            de tarjeta que Safari respeta de forma consistente. */}
        <div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d", WebkitTransformStyle: "preserve-3d" }}
        >
          {/* Página 2, estática — 1px de profundidad real detrás de la
              tarjeta (imperceptible en escala, ~0.08% con perspective de
              1200px) para que el orden de pintado no dependa de z-index. */}
          <div
            className="absolute inset-0"
            style={{ transform: "translateZ(-1px)" }}
          >
            <StyleJournalPage items={outfits[1].items} outfitName={outfits[1].name} index={1} />
          </div>

          {/* La tarjeta que voltea (página 1). El rotateY vive acá, en el
              padre — las dos caras de abajo comparten el mismo
              transform-origin y giran juntas sin transform propio de giro
              (la trasera solo lleva su rotateY(180deg) FIJO, para plegarse
              "hacia atrás" de la delantera). preserve-3d es necesario para
              que ese pliegue de la trasera se componga en 3D respecto al
              giro del padre en vez de aplanarse antes.

              Profundidad: además de rotar, este transform lleva un
              translateZ que solo importa cuando está ASENTADA en la
              página 2 (translateZ(-2px), más atrás que el -1px de esa
              página, para que su dorso en blanco no la tape). Va ANTES del
              rotateY a propósito — CSS compone los transforms de derecha a
              izquierda, así que un translateZ puesto DESPUÉS de
              rotateY(-180deg) queda adentro de esa rotación y el giro le
              invierte el signo (medido: translateZ(-2px) después del
              rotateY terminaba componiendo a +2, es decir MÁS adelante, no
              atrás). Puesto antes, se aplica en el marco del padre, ya
              fuera de la rotación, y el signo se respeta.

              Mientras gira — arrastre o tween — applyAngle() pisa este
              mismo `style.transform` en cada frame escribiendo SOLO
              `rotateY(...)`, sin Z (Z implícito 0, o sea "adelante") — así
              que el translateZ de acá abajo solo aplica en el instante en
              que React vuelve a renderizar con un pageIdx nuevo (justo
              cuando el volteo termina), nunca a mitad de un frame animado.
              Y por la misma razón, ni bien arranca un arrastre hacia atrás
              (pageIdx todavía en 1) el primer applyAngle() borra ese
              translateZ y la trae al frente de inmediato — no hace falta
              ningún estado de "isDragging" para eso. */}
          <div
            ref={cardRef}
            className="absolute inset-0"
            style={{
              transformOrigin: "left center",
              transformStyle: "preserve-3d",
              WebkitTransformStyle: "preserve-3d",
              transform: `translateZ(${pageIdx === 1 ? -2 : 0}px) rotateY(${angleForPage(pageIdx)}deg)`,
            }}
          >
            {/* Cara frontal — outfit 1. */}
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transformOrigin: "left center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cuaderno.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
              <StyleJournalPage items={outfits[0].items} outfitName={outfits[0].name} index={0} />
              <div
                ref={frontShadowRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ background: SHADOW_GRADIENT, opacity: 0 }}
              />
            </div>

            {/* Cara trasera — el dorso de la hoja: papel en blanco, sin
                contenido de outfit ni espiral (el espiral es la capa fija de
                z=30, siempre por encima de ambas caras). Sin esto, la hoja
                desaparece de golpe al cruzar los 90° (backface-visibility la
                esconde) y se pierde toda la segunda mitad del volteo. */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transformOrigin: "left center",
                transform: "rotateY(180deg)",
                backgroundColor: "#FAF6F0",
              }}
            >
              <div
                ref={backShadowRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ background: SHADOW_GRADIENT, opacity: 0 }}
              />
            </div>
          </div>
        </div>

        {/* z=30 — espiral recortado del mismo arte, siempre por encima de
            ambas caras: la hoja tiene que pasar por DETRÁS de los anillos
            al girar, no por encima. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cuaderno.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ zIndex: 30, clipPath: SPIRAL_CLIP_PATH, WebkitClipPath: SPIRAL_CLIP_PATH }}
        />

        {/* Chevron persistente: affordance de "hay otra página" para quien
            se perdió el nudge de entrada. Se oculta en la última página —
            llegar ahí ya confirma el gesto. */}
        {pageIdx === 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 z-40 -translate-y-1/2 text-2xl text-text-faint/70"
          >
            ›
          </span>
        )}
      </div>

      {/* Dots indicadores */}
      <div className="flex justify-center gap-2" role="tablist" aria-label="Página del cuaderno">
        {outfits.map((o, idx) => (
          <button
            key={idx}
            type="button"
            role="tab"
            aria-selected={idx === pageIdx}
            aria-label={`Ver página ${idx + 1}: ${o.name}`}
            onClick={() => {
              if (!isAnimating) flipTo(idx as 0 | 1);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className={[
                "block rounded-full transition-all duration-200",
                idx === pageIdx ? "h-2.5 w-2.5 bg-primary" : "h-2 w-2 bg-primary-mid opacity-60",
              ].join(" ")}
            />
          </button>
        ))}
      </div>

      {/* Fila de acciones — fija, enlazada a la página visible (pageIdx),
          nunca duplicada por página (ver justificación en el header del
          archivo). */}
      <div
        className="flex flex-col gap-3 transition-opacity duration-150"
        style={{ opacity: chromeVisible ? 1 : 0 }}
      >
        <Button
          variant={yaGuardado ? "secondary" : "primary"}
          size="lg"
          fullWidth
          onClick={() => onGuardar(pageIdx)}
          isLoading={estado === "saving"}
          loadingText="Guardando..."
          disabled={yaGuardado || estado === "saving" || estado === "usingToday"}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill={yaGuardado ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
            </svg>
          }
        >
          {yaGuardado ? "Guardado" : "Guardar outfit"}
        </Button>

        <Button
          variant={usadoHoy ? "secondary" : "ghost"}
          size="lg"
          fullWidth
          onClick={() => onUsarHoy(pageIdx)}
          isLoading={estado === "usingToday"}
          loadingText="Registrando..."
          disabled={usadoHoy || estado === "saving" || estado === "usingToday"}
        >
          {usadoHoy ? "Ya usado hoy" : "Lo usaré hoy"}
        </Button>

        {estado === "error" && errMsg && <span className="text-xs text-danger">{errMsg}</span>}

        <div className="mx-auto">
          <ShareStyleJournalButton
            key={pageIdx}
            outfitId={outfitIds[pageIdx] ?? syntheticIds[pageIdx]}
            outfitName={shown.name}
            items={shown.items}
          />
        </div>

        {!yaGuardado && (
          <button
            type="button"
            onClick={() => setFeedbackAbierto(true)}
            className="mx-auto flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-xs font-medium text-text-muted transition-colors duration-150 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L11 22a1.93 1.93 0 0 1-2-2v-1.88Z" />
            </svg>
            No me convence
          </button>
        )}
      </div>

      {feedbackAbierto && (
        <OutfitFeedbackSheet
          clothingItemIds={shown.items.map((i) => i.id)}
          occasion={contextoOcasion}
          mode={modo}
          onClose={() => setFeedbackAbierto(false)}
          onSubmitted={() => {
            setFeedbackAbierto(false);
            onToast("Listo, lo tendremos en cuenta", "success");
            // Regeneramos de una: quien dice "no me convence" quiere otra
            // propuesta, no quedarse mirando la que rechazó.
            onRegenerate();
          }}
        />
      )}
    </div>
  );
}
