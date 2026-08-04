// Bloqueo suave del generador cuando el armario no da para outfits decentes.
//
// NO es un mensaje de error. Es una pantalla de progreso: el usuario ve cuánto
// le falta, qué le falta exactamente, y cada línea incompleta lo lleva a
// subirlo. El botón "Generar outfit" se queda visible pero deshabilitado, para
// que se entienda que existe y está cerca — no que desapareció.
//
// Tono: motivador, nunca crítico. "Te faltan 2 prendas para empezar", jamás
// "tu armario está incompleto".

"use client";

import Link from "next/link";
import type { WardrobeMinimums } from "@/lib/wardrobe/wardrobeMinimums";

// El paso de categoría del upload va DESPUÉS de la foto (y la IA ya lo
// pre-marca), así que no hay forma de preseleccionarla por query param sin
// pelearse con la detección. Mandamos al modo individual y ya.
const UPLOAD_HREF = "/wardrobe/upload?modo=individual";

type Row = {
  key: string;
  label: string;
  /** Frase corta que dice qué subir, para cuando la línea está incompleta. */
  hint: string;
  have: number;
  need: number;
};

/**
 * Elige el camino más corto para completar la base y arma las filas.
 *
 * Hay dos formas de cumplir: 2 tops + 2 bottoms, o 1 vestido + 1 prenda más.
 * Mostrar las dos a la vez confunde; mostramos aquella en la que el usuario ya
 * está más cerca. La vía del vestido solo se ofrece si ya tiene uno — si no,
 * el camino natural es tops y bottoms.
 */
function buildRows(min: WardrobeMinimums): Row[] {
  const faltaPorTopsBottoms =
    Math.max(0, min.tops.need - min.tops.have) +
    Math.max(0, min.bottoms.need - min.bottoms.have);
  const acompanantes = min.tops.have + min.bottoms.have;
  const faltaPorVestido =
    Math.max(0, min.dresses.need - min.dresses.have) + Math.max(0, 1 - acompanantes);

  const viaVestido = min.dresses.have >= 1 && faltaPorVestido < faltaPorTopsBottoms;

  const base: Row[] = viaVestido
    ? [
        {
          key: "dress",
          label: "Vestidos o enterizos",
          hint: "Sube un vestido",
          have: min.dresses.have,
          need: min.dresses.need,
        },
        {
          key: "companion",
          label: "Una prenda más",
          hint: "Sube un top o un bottom",
          have: acompanantes,
          need: 1,
        },
      ]
    : [
        {
          key: "tops",
          label: "Prendas de arriba",
          hint: "Camisetas, camisas, blusas",
          have: min.tops.have,
          need: min.tops.need,
        },
        {
          key: "bottoms",
          label: "Prendas de abajo",
          hint: "Jeans, pantalones, faldas",
          have: min.bottoms.have,
          need: min.bottoms.need,
        },
      ];

  return [
    ...base,
    {
      key: "footwear",
      label: "Calzado",
      hint: "Tenis, botas, zapatos",
      have: min.footwear.have,
      need: min.footwear.need,
    },
  ];
}

export default function WardrobeMinimumsChecklist({
  minimums,
}: {
  minimums: WardrobeMinimums;
}) {
  const rows = buildRows(minimums);

  const faltantes = rows.reduce((acc, r) => acc + Math.max(0, r.need - r.have), 0);
  const requeridas = rows.reduce((acc, r) => acc + r.need, 0);
  const logradas = rows.reduce((acc, r) => acc + Math.min(r.have, r.need), 0);
  const progreso = Math.round((logradas / requeridas) * 100);

  const titulo = minimums.empty
    ? "Empecemos por tu armario"
    : faltantes === 1
      ? "Te falta 1 prenda para empezar"
      : `Te faltan ${faltantes} prendas para empezar`;

  return (
    <section
      aria-labelledby="minimos-titulo"
      className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-primary">
        Tu armario
      </p>
      <h2
        id="minimos-titulo"
        className="mt-2 font-display text-2xl font-bold text-text sm:text-3xl"
      >
        {titulo}
      </h2>
      <p className="mt-2 max-w-md text-sm text-text-muted">
        Con esta base la IA ya puede combinar y proponerte dos looks distintos.
        Sube lo que te falte y arrancamos.
      </p>

      {/* Progreso agregado. scaleX en vez de width para no forzar layout. */}
      <div className="mt-6">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuenow={progreso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de tu armario"
        >
          <div
            className="h-full w-full origin-left rounded-full bg-primary motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out"
            style={{ transform: `scaleX(${logradas / requeridas})` }}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-text-muted">
          {logradas} de {requeridas} prendas listas
        </p>
      </div>

      <ul className="mt-6 space-y-2">
        {rows.map((row) => (
          <ChecklistRow key={row.key} row={row} />
        ))}
      </ul>
    </section>
  );
}

function ChecklistRow({ row }: { row: Row }) {
  const completa = row.have >= row.need;
  const contador = `${Math.min(row.have, row.need)}/${row.need}`;

  const contenido = (
    <>
      <StatusIcon done={completa} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-text">{row.label}</span>
        <span className="block text-xs text-text-muted">
          {completa ? "Listo" : row.hint}
        </span>
      </span>
      <span
        className={[
          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
          completa ? "bg-primary-light text-primary" : "bg-surface-2 text-text-muted",
        ].join(" ")}
      >
        {contador}
      </span>
      {!completa && <ChevronIcon />}
    </>
  );

  // Solo las líneas incompletas son tocables: llevar a subir algo que ya
  // está completo no aporta nada y ensucia el orden de tabulación.
  if (completa) {
    return (
      <li className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5">
        {contenido}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={UPLOAD_HREF}
        aria-label={`${row.label}: ${row.have} de ${row.need}. Subir prenda.`}
        className="flex min-h-[44px] items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors duration-150 hover:border-primary-mid hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {contenido}
      </Link>
    </li>
  );
}

function StatusIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 13 4 4L19 7" />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border text-text-faint"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-text-faint"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
