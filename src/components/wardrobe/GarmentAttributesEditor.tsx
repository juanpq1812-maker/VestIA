// Los atributos de una prenda dentro de una tarjeta abierta de la pantalla de
// revisión (ReviewItemCard).
//
// POR QUÉ EXISTE. Antes esto eran cuatro filas de píldoras idénticas, sin un
// solo rótulo que dijera qué preguntaba cada una. Dos problemas concretos:
//
//   1. Sin encabezados, el usuario adivinaba qué era cada fila.
//   2. Categoría y subcategoría se veían IGUAL — misma píldora, mismo tamaño,
//      mismo espaciado — cuando están en niveles jerárquicos distintos. "Tops"
//      y "Camiseta" se leían como una sola lista de doce opciones sueltas.
//
// Acá la categoría es un bloque segmentado (una sola elección entre seis, un
// objeto visual distinto) y la subcategoría son chips subordinados debajo, que
// solo muestran las opciones de la categoría activa y llevan el ícono de la
// prenda — los mismos 62 de public/icons/prendas que usa el flujo individual.

"use client";

import Chip from "@/components/onboarding/Chip";
import { COLOR_PALETTE, ITEM_OCCASIONS, SUBCATEGORIES } from "@/lib/wardrobe/constants";
import { getSubcategoryIcon } from "@/lib/wardrobe/icons";
import type { MissingField, ReviewEdits } from "@/lib/wardrobe/reviewState";
import { CLOTHING_CATEGORIES } from "@/types/database";

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Props = {
  edits: ReviewEdits;
  onEdit: (patch: Partial<ReviewEdits>) => void;
  missing: MissingField[];
  /** Lo que Vision creyó ver cuando no matcheó ("buzo"). null si matcheó bien. */
  subcategoryHint: string | null;
  /** Sufijo para los ids/labels — hay una instancia por prenda en la lista. */
  idPrefix: string;
};

/** Rótulo de grupo. El campo que falta se dice acá, no solo al final del formulario. */
function GroupLabel({
  children,
  falta,
}: {
  children: React.ReactNode;
  falta: boolean;
}) {
  return (
    <p
      className={`text-xs font-bold uppercase tracking-widest ${
        falta ? "text-danger" : "text-text-muted"
      }`}
    >
      {children}
      {falta ? (
        <span className="ml-1.5 font-semibold normal-case tracking-normal">· falta</span>
      ) : null}
    </p>
  );
}

export default function GarmentAttributesEditor({
  edits,
  onEdit,
  missing,
  subcategoryHint,
  idPrefix,
}: Props) {
  // Hoisted para que el ícono de cada chip tenga una categoría tipada sin
  // castear: dentro del bloque de subcategorías `categoria` nunca es null.
  const categoria = edits.category || null;
  const subcategoryOptions = categoria ? SUBCATEGORIES[categoria] : [];
  const faltaCategoria = missing.includes("categoría") || missing.includes("subcategoría");
  const faltaColor = missing.includes("color");
  const faltaOcasion = missing.includes("ocasión");

  return (
    <div className="flex flex-col gap-5">
      {/* ── ¿Qué es? ───────────────────────────────────────────────────── */}
      <div>
        <GroupLabel falta={faltaCategoria}>¿Qué es?</GroupLabel>

        {/* Bloque segmentado: seis celdas contiguas dentro de un mismo riel.
            Que compartan fondo es lo que lo hace leer como UNA pregunta con
            seis respuestas, y no como seis píldoras sueltas del mismo rango
            que los chips de abajo. Dos filas de tres y no una de seis porque
            "Accesorios" no cabe en un sexto de un iPhone. */}
        <div
          role="radiogroup"
          aria-label="Categoría"
          className="mt-2 grid max-w-sm grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1"
        >
          {CLOTHING_CATEGORIES.map((cat) => {
            const activa = edits.category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                role="radio"
                aria-checked={activa}
                onClick={() => onEdit({ category: cat.value, subcategory: "" })}
                className={[
                  "rounded-lg px-2 py-1.5 text-xs font-semibold transition-all duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  activa
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:bg-surface hover:text-text",
                ].join(" ")}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {subcategoryHint ? (
          <p className="mt-2 text-xs text-text-muted">
            Detectamos <span className="font-semibold text-text">«{subcategoryHint}»</span> y
            no supimos a cuál corresponde. ¿Cuál es?
          </p>
        ) : null}

        {/* Subcategoría: subordinada a propósito — chip más chico, sin borde
            propio cuando está inactivo, y solo las opciones de la categoría
            activa. */}
        {categoria && subcategoryOptions.length > 0 ? (
          <div
            role="radiogroup"
            aria-label="Subcategoría"
            className="mt-2 flex flex-wrap gap-1.5"
          >
            {subcategoryOptions.map((opt) => {
              const activa = edits.subcategory === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={activa}
                  onClick={() => onEdit({ subcategory: opt })}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5",
                    "text-xs font-medium transition-all duration-150",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    activa
                      ? "border-primary bg-primary-light text-primary"
                      : "border-transparent bg-surface-2 text-text-muted hover:bg-surface-offset hover:text-text",
                  ].join(" ")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getSubcategoryIcon(opt, categoria)}
                    alt=""
                    className="h-5 w-5 shrink-0 object-contain"
                  />
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-xs text-text-faint">
            Elige primero qué tipo de prenda es.
          </p>
        )}
      </div>

      {/* ── Color ──────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline gap-2">
          <GroupLabel falta={faltaColor}>Color</GroupLabel>
          {edits.color ? (
            // El nombre elegido, escrito. Un anillo alrededor de un círculo no
            // dice cuál es para quien no distingue bien esos dos grises.
            <span className="text-xs text-text-muted">{capitalizar(edits.color)}</span>
          ) : null}
        </div>
        <div
          role="radiogroup"
          aria-label="Color principal"
          className="mt-2 flex flex-wrap gap-2"
        >
          {COLOR_PALETTE.map((c) => {
            const activo = edits.color === c.name;
            return (
              <button
                key={c.name}
                type="button"
                role="radio"
                aria-checked={activo}
                title={c.name}
                aria-label={c.name}
                onClick={() => onEdit({ color: c.name })}
                className={[
                  "h-6 w-6 rounded-full transition-shadow duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  activo
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                    : "ring-1 ring-border hover:ring-primary-mid",
                ].join(" ")}
                style={{ background: c.swatch }}
              />
            );
          })}
        </div>
      </div>

      {/* ── ¿Para qué ocasión? ─────────────────────────────────────────── */}
      <div>
        <GroupLabel falta={faltaOcasion}>¿Para qué ocasión?</GroupLabel>
        <div
          role="group"
          aria-label="Ocasiones"
          id={`${idPrefix}-ocasiones`}
          className="mt-2 flex flex-wrap gap-1.5"
        >
          {ITEM_OCCASIONS.map((o) => (
            <Chip
              key={o}
              active={edits.occasions.includes(o)}
              onClick={() => onEdit({ occasions: toggle(edits.occasions, o) })}
              className="px-3! py-1.5! text-xs!"
            >
              {o}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
