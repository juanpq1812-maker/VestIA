"use client";

// PROTOTIPO VISUAL — NO CONECTADO A NADA.
// Ningún click acá guarda datos, llama a Vision, ni toca la base de datos.
// Es una maqueta estática para evaluar si un selector "tocar el maniquí"
// reduce la fatiga de subir prendas una por una. Ver /wardrobe/upload para
// el flujo real de subida (ese sí está conectado).
//
// Categorías, subcategorías, colores y ocasiones son los reales de
// `src/lib/wardrobe/constants.ts` y `src/types/database.ts` — se copian acá
// (no se importan) para mantener este prototipo 100% aislado del código de
// producción, tal como pidió Juan.

import { useMemo, useState } from "react";

type CategoryKey =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "footwear"
  | "accessory"
  | "body";

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  top: "Tops",
  bottom: "Bottoms",
  dress: "Vestidos",
  outerwear: "Abrigos",
  footwear: "Calzado",
  accessory: "Accesorios",
  body: "Body",
};

const SUBCATEGORIES: Record<CategoryKey, readonly string[]> = {
  top: ["Camisa", "Camiseta", "Blusa", "Suéter", "Hoodie", "Tank top"],
  bottom: ["Jean", "Pantalón", "Short", "Falda", "Leggings"],
  dress: ["Vestido corto", "Vestido largo", "Enterizo"],
  outerwear: [
    "Chaqueta",
    "Saco",
    "Blazer",
    "Gabán",
    "Abrigo",
    "Abrigo largo",
    "Impermeable",
    "Cardigan",
    "Chaleco",
    "Cortavientos",
    "Gabardina",
  ],
  footwear: ["Tenis", "Zapatos formales", "Sandalias", "Botas", "Tacones"],
  accessory: ["Gorra", "Bolso", "Cinturón", "Bufanda", "Joyería", "Reloj"],
  body: [
    "Body manga larga",
    "Body manga corta",
    "Body sin mangas",
    "Body escotado",
  ],
};

type ColorOption = {
  name: string;
  swatch: string;
  contrastText: "light" | "dark";
};

const COLOR_PALETTE: readonly ColorOption[] = [
  { name: "negro", swatch: "#111111", contrastText: "light" },
  { name: "blanco", swatch: "#ffffff", contrastText: "dark" },
  { name: "gris", swatch: "#6b7280", contrastText: "light" },
  { name: "azul", swatch: "#2563eb", contrastText: "light" },
  { name: "rojo", swatch: "#dc2626", contrastText: "light" },
  { name: "verde", swatch: "#16a34a", contrastText: "light" },
  { name: "amarillo", swatch: "#facc15", contrastText: "dark" },
  { name: "rosa", swatch: "#ec4899", contrastText: "light" },
  { name: "morado", swatch: "#7c3aed", contrastText: "light" },
  { name: "beige", swatch: "#d6c7a3", contrastText: "dark" },
  { name: "café", swatch: "#6b3f1d", contrastText: "light" },
  { name: "naranja", swatch: "#f97316", contrastText: "light" },
  {
    name: "multicolor",
    swatch:
      "conic-gradient(from 0deg, #ef4444, #f97316, #facc15, #16a34a, #2563eb, #7c3aed, #ec4899, #ef4444)",
    contrastText: "light",
  },
];

const ITEM_OCCASIONS: readonly string[] = [
  "Formal",
  "Casual",
  "Deportivo",
  "Fiesta",
  "Trabajo",
  "Universidad",
  "Citas",
  "Casa",
  "Eventos formales",
];

type ZoneId = "cabeza" | "torso" | "brazos" | "manos" | "piernas" | "pies";
type ModifierId = "capas" | "pieza";
type SelectionId = ZoneId | ModifierId;

const ZONE_CATEGORY: Record<ZoneId, CategoryKey> = {
  cabeza: "accessory",
  torso: "top",
  brazos: "top",
  manos: "accessory",
  piernas: "bottom",
  pies: "footwear",
};

const ZONE_LABELS: Record<ZoneId, string> = {
  cabeza: "Cabeza",
  torso: "Torso",
  brazos: "Brazos",
  manos: "Manos / muñecas",
  piernas: "Piernas",
  pies: "Pies",
};

export default function MannequinPrototype() {
  // "Vision ya detectó" — arranca pre-llenado con lo que Vision habría
  // detectado en la foto (una chaqueta verde). El usuario confirma o
  // corrige, no elige desde cero.
  const [selection, setSelection] = useState<SelectionId>("capas");
  const [isBody, setIsBody] = useState(false); // dentro de "pieza": vestido vs body
  const [subcategory, setSubcategory] = useState<string | null>("Chaqueta");
  const [color, setColor] = useState<string | null>("verde");
  const [occasions, setOccasions] = useState<string[]>(["Casual"]);
  const [wasAiPrefill, setWasAiPrefill] = useState(true);
  const [showAllColors, setShowAllColors] = useState(false);

  const category: CategoryKey = useMemo(() => {
    if (selection === "capas") return "outerwear";
    if (selection === "pieza") return isBody ? "body" : "dress";
    return ZONE_CATEGORY[selection];
  }, [selection, isBody]);

  const zoneLabel =
    selection === "capas"
      ? "Torso (con capas)"
      : selection === "pieza"
        ? "Cuerpo entero"
        : ZONE_LABELS[selection];

  function selectZone(id: SelectionId) {
    setSelection(id);
    setSubcategory(null);
    setWasAiPrefill(false);
  }

  function toggleOccasion(o: string) {
    setOccasions((prev) =>
      prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o],
    );
  }

  const basicColors = COLOR_PALETTE.slice(0, 8);
  const extraColors = COLOR_PALETTE.slice(8);
  const visibleColors = showAllColors ? COLOR_PALETTE : basicColors;

  const isZoneActive = (id: SelectionId) => selection === id;

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Barra de contexto del prototipo — deja clarísimo que no es real */}
      <div className="sticky top-0 z-30 border-b border-divider bg-primary-light/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-4 py-2 text-center">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
            aria-hidden="true"
          />
          <p className="text-[11px] font-semibold text-primary">
            Prototipo visual — nada se guarda ni se conecta
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        <header className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Subir prenda · idea
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-text">
            Toca tu maniquí
          </h1>
        </header>

        {/* Maniquí + panel de detalles, lado a lado */}
        <div className="flex gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
          {/* Columna izquierda: maniquí compacto + modificadores */}
          <div className="flex w-[112px] flex-shrink-0 flex-col items-center gap-2 sm:w-[136px]">
            <Mannequin
              active={selection}
              onSelect={(id) => selectZone(id)}
              isZoneActive={isZoneActive}
            />
            <div className="flex w-full flex-col gap-1.5">
              <ModifierChip
                active={selection === "capas"}
                onClick={() => selectZone("capas")}
                icon="🧥"
                label="Con capas"
              />
              <ModifierChip
                active={selection === "pieza"}
                onClick={() => selectZone("pieza")}
                icon="👗"
                label="Una pieza"
              />
            </div>
          </div>

          {/* Columna derecha: detección + subcategorías + colores */}
          <div className="min-w-0 flex-1" aria-live="polite">
            {wasAiPrefill ? (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <SparkleIcon />
                <span className="truncate">
                  IA detectó: {subcategory} · {capitalize(color)}
                </span>
              </div>
            ) : (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Zona seleccionada manualmente
              </div>
            )}

            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-semibold leading-tight text-text">
                {CATEGORY_LABELS[category]}
              </h2>
              <span className="shrink-0 text-[11px] text-text-faint">
                {zoneLabel}
              </span>
            </div>

            {selection === "pieza" ? (
              <div className="mt-1.5 inline-flex rounded-full border border-border bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setIsBody(false)}
                  className={[
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150",
                    !isBody
                      ? "bg-primary text-white"
                      : "text-text-muted hover:text-text",
                  ].join(" ")}
                >
                  Vestido
                </button>
                <button
                  type="button"
                  onClick={() => setIsBody(true)}
                  className={[
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150",
                    isBody
                      ? "bg-primary text-white"
                      : "text-text-muted hover:text-text",
                  ].join(" ")}
                >
                  Body
                </button>
              </div>
            ) : null}

            {/* Subcategorías */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUBCATEGORIES[category].map((sub) => {
                const active = subcategory === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSubcategory(sub)}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                      "border transition-all duration-150",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      active
                        ? "border-primary bg-primary text-white shadow-sm"
                        : "border-border bg-surface text-text-muted hover:border-primary-mid hover:bg-surface-2 hover:text-text",
                    ].join(" ")}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>

            {/* Color, justo debajo de las subcategorías */}
            <div className="mt-3 border-t border-divider pt-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-faint">
                Color
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {visibleColors.map((c) => {
                  const active = color === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      aria-pressed={active}
                      aria-label={c.name}
                      title={c.name}
                      onClick={() => setColor(c.name)}
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-150",
                        active
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary-mid",
                      ].join(" ")}
                      style={{ background: c.swatch }}
                    >
                      {active ? (
                        <CheckIcon
                          color={
                            c.contrastText === "light" ? "#fff" : "#1c1c1a"
                          }
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {extraColors.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllColors((v) => !v)}
                  className="mt-1.5 text-[11px] font-medium text-primary hover:underline"
                >
                  {showAllColors ? "Ver menos" : "Ver más colores"}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Ocasión — full width, tarjetas */}
        <section className="mt-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold text-text">
              Ocasión
            </h2>
            <span className="text-[11px] text-text-faint">
              Podés marcar más de una
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {ITEM_OCCASIONS.map((o) => {
              const active = occasions.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleOccasion(o)}
                  className={[
                    "rounded-lg border px-2 py-2 text-center text-xs font-semibold transition-all duration-150",
                    active
                      ? "border-primary bg-primary-light text-primary shadow-sm"
                      : "border-border bg-surface text-text-muted hover:border-primary-mid hover:bg-surface-2 hover:text-text",
                  ].join(" ")}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </section>

        {/* CTA de confirmación — no hace nada, es maqueta */}
        <div className="mt-4 flex flex-col gap-1.5">
          <button
            type="button"
            disabled
            title="Prototipo — este botón no guarda nada"
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white opacity-60 shadow-sm"
          >
            Confirmar prenda
          </button>
          <p className="text-center text-[11px] text-text-faint">
            Botón desactivado a propósito — este prototipo no guarda datos.
          </p>
        </div>
      </main>
    </div>
  );
}

function capitalize(s: string | null) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ModifierChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "inline-flex w-full items-center justify-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition-all duration-150",
        active
          ? "border-primary bg-primary text-white shadow-sm"
          : "border-border bg-surface text-text-muted hover:border-primary-mid hover:bg-surface-2 hover:text-text",
      ].join(" ")}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8.5L6.2 11.5L13 4.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Maniquí SVG — silueta simple, compacta, zonas clickeables grandes (para
// dedo, no mouse). Cada zona tiene su propio hit-area transparente más ancho
// que el trazo visible, para que sea fácil de tocar en un iPhone.
// ---------------------------------------------------------------------------

// Croquis de moda dibujado a mano, path por path — nada de formas geométricas
// genéricas. Cada zona del cuerpo es un <path> independiente con su propio
// id, para poder resaltarla sola al tocarla. Paleta: crudo/hueso en reposo,
// contorno verde oscuro fino, sage green cuando la zona está seleccionada.
const INK = "#516351"; // contorno, verde oscuro sutil
const BONE = "#FAF0E6"; // relleno en reposo, crema/hueso
const SAGE = "#8B9E8A"; // relleno de la zona seleccionada
const SAGE_SOFT = "#B9C6B4"; // halo/pulso decorativo

function Mannequin({
  active,
  onSelect,
  isZoneActive,
}: {
  active: SelectionId;
  onSelect: (id: ZoneId) => void;
  isZoneActive: (id: SelectionId) => boolean;
}) {
  const fillFor = (id: ZoneId) => (isZoneActive(id) ? SAGE : BONE);
  const strokeWidthFor = (id: ZoneId) => (isZoneActive(id) ? 2 : 1.25);
  const strokeOpacityFor = (id: ZoneId) => (isZoneActive(id) ? 1 : 0.65);

  return (
    <svg
      viewBox="0 0 200 460"
      className="mx-auto h-[190px] w-auto touch-manipulation select-none sm:h-[220px]"
      role="group"
      aria-label="Maniquí — tocá una zona del cuerpo"
    >
      {/* Overlay "con capas" — silueta ensanchada detrás del torso */}
      <rect
        x={50}
        y={92}
        width={100}
        height={128}
        rx={22}
        fill="none"
        stroke={isZoneActive("capas") ? SAGE : INK}
        strokeDasharray="4 5"
        strokeWidth={isZoneActive("capas") ? 2.5 : 1.25}
        opacity={isZoneActive("capas") ? 1 : 0.4}
        className="transition-all duration-200 ease-out"
      />

      {/* Zona inferior — falda/piernas, una silueta continua que se afina
          hacia los tobillos */}
      <g
        onClick={() => onSelect("piernas")}
        className="cursor-pointer transition-all duration-200 ease-out"
        role="button"
        aria-pressed={isZoneActive("piernas")}
        aria-label="Zona inferior — Bottoms"
      >
        <path
          id="zona-inferior"
          d="M72,212 L128,212
             C133,240 131,270 123,300
             C118,330 111,362 106,392
             C104,406 103,417 102,426
             L98,426
             C97,417 96,406 94,392
             C89,362 82,330 77,300
             C69,270 67,240 72,212 Z"
          fill={fillFor("piernas")}
          stroke={INK}
          strokeWidth={strokeWidthFor("piernas")}
          strokeOpacity={strokeOpacityFor("piernas")}
        />
        <rect x={54} y={206} width={92} height={230} fill="transparent" />
      </g>

      {/* Pies */}
      <g
        onClick={() => onSelect("pies")}
        className="cursor-pointer transition-all duration-200 ease-out"
        role="button"
        aria-pressed={isZoneActive("pies")}
        aria-label="Pies — Calzado"
      >
        <path
          id="pies"
          d="M84,426 C79,429 74,435 78,441 C84,445 95,445 100,441 L100,426 Z
             M116,426 C121,429 126,435 122,441 C116,445 105,445 100,441 L100,426 Z"
          fill={fillFor("pies")}
          stroke={INK}
          strokeWidth={strokeWidthFor("pies")}
          strokeOpacity={strokeOpacityFor("pies")}
        />
        <rect x={64} y={418} width={72} height={40} fill="transparent" />
      </g>

      {/* Brazo izquierdo */}
      <g
        onClick={() => onSelect("brazos")}
        className="cursor-pointer transition-all duration-200 ease-out"
        role="button"
        aria-pressed={isZoneActive("brazos")}
        aria-label="Brazo izquierdo — Tops"
      >
        <path
          id="brazo-izquierdo"
          d="M64,110
             C48,126 38,150 36,180
             C34,204 36,218 40,228
             L52,226
             C50,208 50,188 54,166
             C58,144 66,126 78,114
             C74,111 69,110 64,110 Z"
          fill={fillFor("brazos")}
          stroke={INK}
          strokeWidth={strokeWidthFor("brazos")}
          strokeOpacity={strokeOpacityFor("brazos")}
        />
        <rect x={20} y={100} width={50} height={148} fill="transparent" />
      </g>

      {/* Brazo derecho */}
      <g
        onClick={() => onSelect("brazos")}
        className="cursor-pointer transition-all duration-200 ease-out"
        role="button"
        aria-pressed={isZoneActive("brazos")}
        aria-label="Brazo derecho — Tops"
      >
        <path
          id="brazo-derecho"
          d="M136,110
             C152,126 162,150 164,180
             C166,204 164,218 160,228
             L148,226
             C150,208 150,188 146,166
             C142,144 134,126 122,114
             C126,111 131,110 136,110 Z"
          fill={fillFor("brazos")}
          stroke={INK}
          strokeWidth={strokeWidthFor("brazos")}
          strokeOpacity={strokeOpacityFor("brazos")}
        />
        <rect x={130} y={100} width={50} height={148} fill="transparent" />
      </g>

      {/* Manos / muñecas */}
      <g
        onClick={() => onSelect("manos")}
        className="cursor-pointer transition-all duration-200 ease-out"
        role="button"
        aria-pressed={isZoneActive("manos")}
        aria-label="Manos y muñecas — Accesorios"
      >
        <path
          id="manos"
          d="M42,232 m-9,0 a9,9 0 1,0 18,0 a9,9 0 1,0 -18,0
             M158,232 m-9,0 a9,9 0 1,0 18,0 a9,9 0 1,0 -18,0"
          fill={fillFor("manos")}
          stroke={INK}
          strokeWidth={strokeWidthFor("manos")}
          strokeOpacity={strokeOpacityFor("manos")}
        />
        <rect x={26} y={216} width={32} height={32} fill="transparent" />
        <rect x={142} y={216} width={32} height={32} fill="transparent" />
      </g>

      {/* Torso — talle de sastrería, se afina en la cintura sobre el brazo
          para que el click del centro gane */}
      <g
        onClick={() => onSelect("torso")}
        className="cursor-pointer transition-all duration-200 ease-out"
        role="button"
        aria-pressed={isZoneActive("torso") || isZoneActive("capas")}
        aria-label="Torso — Tops"
      >
        <path
          id="torso"
          d="M66,108
             C60,120 58,132 62,146
             C56,158 58,168 66,178
             C60,190 62,202 72,212
             L128,212
             C138,202 140,190 134,178
             C142,168 144,158 138,146
             C142,132 140,120 134,108
             C124,100 112,96 100,96
             C88,96 76,100 66,108 Z"
          fill={
            isZoneActive("torso") || isZoneActive("capas") ? SAGE : BONE
          }
          stroke={INK}
          strokeWidth={isZoneActive("torso") ? 2 : 1.25}
          strokeOpacity={isZoneActive("torso") ? 1 : 0.65}
        />
      </g>

      {/* Cabeza + cuello, un solo path */}
      <g
        onClick={() => onSelect("cabeza")}
        className="cursor-pointer transition-all duration-200 ease-out"
        role="button"
        aria-pressed={isZoneActive("cabeza")}
        aria-label="Cabeza — Accesorios"
      >
        <path
          id="cabeza"
          d="M100,18
             C120,18 133,33 133,54
             C133,75 120,90 100,90
             C80,90 67,75 67,54
             C67,33 80,18 100,18 Z
             M87,88 L87,104
             C87,112 93,118 100,118
             C107,118 113,112 113,104
             L113,88 Z"
          fill={fillFor("cabeza")}
          stroke={INK}
          strokeWidth={strokeWidthFor("cabeza")}
          strokeOpacity={strokeOpacityFor("cabeza")}
        />
        <rect x={62} y={12} width={76} height={112} fill="transparent" />
      </g>

      {/* Halo de "cuerpo entero" — envuelve toda la silueta cuando está activo */}
      {isZoneActive("pieza") ? (
        <rect
          x={14}
          y={6}
          width={172}
          height={444}
          rx={36}
          fill="none"
          stroke={SAGE}
          strokeWidth={2.5}
          strokeDasharray="6 6"
          className="motion-safe:animate-[fadeIn_200ms_ease-out]"
        />
      ) : null}

      {/* Pulso sutil sobre la zona activa del torso, solo decorativo */}
      {isZoneActive("torso") || isZoneActive("capas") ? (
        <path
          d="M66,108
             C60,120 58,132 62,146
             C56,158 58,168 66,178
             C60,190 62,202 72,212
             L128,212
             C138,202 140,190 134,178
             C142,168 144,158 138,146
             C142,132 140,120 134,108
             C124,100 112,96 100,96
             C88,96 76,100 66,108 Z"
          fill="none"
          stroke={SAGE_SOFT}
          strokeWidth={8}
          opacity={0.5}
          className="pointer-events-none motion-safe:animate-pulse"
        />
      ) : null}
    </svg>
  );
}
