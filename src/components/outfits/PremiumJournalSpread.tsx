// Cuaderno de 2 páginas (Premium): un solo objeto Style Journal — no dos
// tarjetas — con el mismo swipe horizontal ahora pasando página en vez de
// cambiar de tarjeta. Reemplaza, para Premium, el carrusel de OutfitCard de
// ResultsGrid (que sigue existiendo tal cual para Free, ver
// OutfitGenerator.tsx). El marco físico (papel + espiral) se dibuja UNA
// sola vez; StyleJournalPage.tsx aporta el contenido de cada página.
//
// Botones (Guardar / Lo usaré hoy / Compartir / No me convence) viven
// AFUERA del marco del cuaderno, no dentro de cada página — ver la sección
// "Botones" del plan de este cambio: el cuaderno es una pieza visual, no un
// panel de control, y una fila fija que solo cambia de texto al pasar
// página es más legible que botones que se arrastran con el swipe.

"use client";

import { useEffect, useState } from "react";
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
import { useSnapPager } from "@/lib/outfits/useSnapPager";
import type { CardEstado } from "@/components/outfits/OutfitGenerator";

type Props = {
  outfits: GeneratedOutfit[];
  onRegenerate: () => void;
  contextoOcasion: string | null;
  modo: GenerateMode;
  onToast: (msg: string, kind: "success" | "error") => void;
};

export default function PremiumJournalSpread({
  outfits,
  onRegenerate,
  contextoOcasion,
  modo,
  onToast,
}: Props) {
  const { scrollerRef, activeIdx, onScroll, scrollToIdx } = useSnapPager({
    count: outfits.length,
    // Sin gap ni gutters: cada página ocupa el 100% del marco — es un solo
    // objeto de ancho fijo, no hay "siguiente tarjeta" asomando del viewport.
  });

  // Header (nombre + badge "IA") y fila de botones van afuera del marco;
  // ambos siguen a `activeIdx` con el mismo fade corto que ya usaba la
  // descripción sincronizada del carrusel de tarjetas, para no cambiar de
  // texto en seco a mitad del swipe.
  const [shownIdx, setShownIdx] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  useEffect(() => {
    if (activeIdx === shownIdx) return;
    setChromeVisible(false);
    const t = setTimeout(() => {
      setShownIdx(activeIdx);
      setChromeVisible(true);
    }, 150);
    return () => clearTimeout(t);
  }, [activeIdx, shownIdx]);

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

  const shown = outfits[shownIdx];
  const estado = estados[shownIdx];
  const errMsg = errMsgs[shownIdx];
  const yaGuardado = estado === "saved" || estado === "usedToday";
  const usadoHoy = estado === "usedToday";

  return (
    // pb-*: el BottomNav fijo de mobile (ver Header.tsx/BottomNav.tsx) tapaba
    // los dots y parte de la fila de botones — mismo patrón que el resto de
    // la app usa para dejarle espacio (pb-24 sm:pb-14), más
    // env(safe-area-inset-bottom) porque este bloque puede terminar de
    // pintarse muy cerca del borde inferior real del teléfono.
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

      {/* Marco del cuaderno: papel + espiral se dibujan UNA sola vez. Las
          páginas (una por outfit) viven en un carrusel de snap interno, sin
          gap — cada una ocupa el 100% del marco. */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cuaderno.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {outfits.map((o, idx) => (
            <div key={`${o.name}-${idx}`} className="relative h-full w-full shrink-0 snap-center">
              <StyleJournalPage items={o.items} outfitName={o.name} index={idx} />
            </div>
          ))}
        </div>

        {/* Chevron persistente: affordance de "hay otra página" para quien
            se perdió el hint de entrada del carrusel (ver useSnapPager). Se
            oculta en la última página — llegar ahí ya confirma el gesto. */}
        {outfits.length > 1 && activeIdx < outfits.length - 1 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-2xl text-text-faint/70"
          >
            ›
          </span>
        )}
      </div>

      {/* Dots indicadores */}
      {outfits.length > 1 && (
        <div className="flex justify-center gap-2" role="tablist" aria-label="Página del cuaderno">
          {outfits.map((o, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={idx === activeIdx}
              aria-label={`Ver página ${idx + 1}: ${o.name}`}
              onClick={() => scrollToIdx(idx)}
              className="flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span
                aria-hidden="true"
                className={[
                  "block rounded-full transition-all duration-200",
                  idx === activeIdx
                    ? "h-2.5 w-2.5 bg-primary"
                    : "h-2 w-2 bg-primary-mid opacity-60",
                ].join(" ")}
              />
            </button>
          ))}
        </div>
      )}

      {/* Fila de acciones — fija, enlazada a la página visible (shownIdx),
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
          onClick={() => onGuardar(shownIdx)}
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
          onClick={() => onUsarHoy(shownIdx)}
          isLoading={estado === "usingToday"}
          loadingText="Registrando..."
          disabled={usadoHoy || estado === "saving" || estado === "usingToday"}
        >
          {usadoHoy ? "Ya usado hoy" : "Lo usaré hoy"}
        </Button>

        {estado === "error" && errMsg && <span className="text-xs text-danger">{errMsg}</span>}

        <div className="mx-auto">
          <ShareStyleJournalButton
            key={shownIdx}
            outfitId={outfitIds[shownIdx] ?? syntheticIds[shownIdx]}
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
