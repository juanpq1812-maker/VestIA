// Una prenda en la pantalla de revisión (/wardrobe/upload/review), colapsada
// por defecto.
//
// POR QUÉ COLAPSADA. Antes cada prenda mostraba sus cuatro grupos de opciones
// desplegados a la vez. Eso es tolerable con una prenda y absurdo con ocho: el
// modo ráfaga terminaba siendo más lento que subir de a una, que es justo lo
// contrario de para lo que existe. El principio del flujo individual es que la
// app decide y el usuario confirma; acá se aplica a N prendas: ocho prendas son
// ocho líneas que se barren de un vistazo, y si todo está bien no se toca nada.
//
// La fila colapsada NO esconde problemas. Dice en su propio resumen lo que
// falta ("Falta color"), lleva el marcador de estado a la derecha y, si está
// incompleta, borde de alerta. Ver reviewState.ts para el criterio completo —
// esconder una prenda incompleta ya costó un bug donde el guardado las
// descartaba en silencio.

"use client";

import Button from "@/components/ui/Button";
import GarmentAttributesEditor from "@/components/wardrobe/GarmentAttributesEditor";
import { summaryLine, type ReviewEdits, type ReviewVerdict } from "@/lib/wardrobe/reviewState";
import { CLOTHING_CATEGORIES, type BurstClothingItem } from "@/types/database";

type Props = {
  item: BurstClothingItem;
  edits: ReviewEdits;
  verdict: ReviewVerdict;
  /** Miniatura ya firmada (thumbnail_path, con fallback a la imagen completa). */
  thumbUrl?: string;
  /** Imagen grande para el detalle abierto — la final o la original, según el toggle. */
  fullUrl?: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onEdit: (patch: Partial<ReviewEdits>) => void;
  onDelete: () => void;
  /** Marcada por el último intento de "Guardar todo" — resaltado fuerte. */
  invalid: boolean;
  /** Toggle "Ver original" (solo prendas reconstruidas). */
  canShowOriginal: boolean;
  showingOriginal: boolean;
  onToggleOriginal: () => void;
  /** Aviso de duplicado (solo outfit_extraction). */
  duplicateUrl?: string;
  onDismissDuplicate: () => void;
  /** Recorrido guiado: a dónde lleva el botón del pie. null = no queda ninguna. */
  nextAttentionId: string | null;
  onGoNext: () => void;
};

const ESTADO_ICONO: Record<ReviewVerdict["state"], { icon: string; className: string; label: string }> = {
  confirmada: { icon: "check", className: "text-primary", label: "Lista" },
  incompleta: { icon: "error", className: "text-danger", label: "Falta completar" },
};

export default function ReviewItemCard({
  item,
  edits,
  verdict,
  thumbUrl,
  fullUrl,
  expanded,
  onToggleExpanded,
  onEdit,
  onDelete,
  invalid,
  canShowOriginal,
  showingOriginal,
  onToggleOriginal,
  duplicateUrl,
  onDismissDuplicate,
  nextAttentionId,
  onGoNext,
}: Props) {
  const categoryLabel =
    CLOTHING_CATEGORIES.find((c) => c.value === edits.category)?.label ?? null;
  const estado = ESTADO_ICONO[verdict.state];
  const panelId = `review-panel-${item.id}`;

  // El borde marca la prenda incompleta desde el principio, no solo después de
  // que el usuario intente guardar: es la única señal que tiene mientras la
  // tarjeta está cerrada.
  // El duplicado NO tiñe el borde. Es una nota: la prenda está completa y se
  // va a guardar. Un borde de alerta la haría parecer un problema, y con la
  // heurística actual (categoría + color) eso pinta medio lote de naranja.
  const borde = invalid
    ? "border-danger ring-2 ring-danger/40"
    : verdict.state === "incompleta"
      ? "border-danger/40"
      : "border-border";

  return (
    <div
      id={`review-item-${item.id}`}
      className={`overflow-hidden rounded-xl border bg-surface shadow-sm transition-shadow duration-200 ${borde}`}
    >
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center gap-2.5 p-3 text-left sm:gap-3 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      >
        <span
          className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2"
          style={{ backgroundColor: item.primary_color ? undefined : "#f0edea" }}
        >
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </span>

        <span className="min-w-0 flex-1">
          {/* Sin `truncate`: en 305px "Suéter · Beige · Casual +2" se cortaba en
              "Suéter · Beige · …" y desaparecían justo los dos campos que el
              usuario viene a revisar. El resumen ES el contenido de la fila, así
              que envuelve; lo que se acota es el subtítulo, que es accesorio. */}
          <span className="block text-sm font-semibold text-text">
            {summaryLine(edits, categoryLabel)}
          </span>
          <span
            className={`mt-0.5 block truncate text-xs ${
              verdict.state === "incompleta"
                ? "text-danger"
                : verdict.notes.includes("posible_duplicado")
                  ? "text-warning"
                  : "text-text-faint"
            }`}
          >
            {/* El resumen de arriba ya NOMBRA lo que falta ("Falta color"),
                así que repetirlo acá gasta la única línea que queda para
                decir qué hacer o por qué. */}
            {verdict.subcategoryHint
              ? `Detectamos «${verdict.subcategoryHint}» — ¿cuál es?`
              : verdict.state === "incompleta"
                ? "Toca para completarla"
                : verdict.notes.includes("posible_duplicado")
                  ? "¿Ya tienes esta en tu armario?"
                  : expanded
                    ? "Toca para cerrar"
                    : "Toca para editar"}
          </span>
        </span>

        <span
          className={`material-symbols-outlined shrink-0 text-lg leading-none ${estado.className}`}
          aria-hidden="true"
        >
          {estado.icon}
        </span>
        <span className="sr-only">{estado.label}</span>
        <span
          className={`material-symbols-outlined shrink-0 text-lg leading-none text-text-faint transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {expanded ? (
        <div
          id={panelId}
          className="border-t border-divider p-4 motion-safe:animate-[fadeInUp_180ms_ease-out]"
        >
          <div className="sm:flex sm:gap-5">
            <div className="flex gap-4 sm:block sm:w-32 sm:shrink-0">
              <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              {fullUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fullUrl}
                  alt="Prenda capturada"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

              <div className="min-w-0 flex-1 sm:mt-2">
                {canShowOriginal ? (
                  <button
                    type="button"
                    onClick={onToggleOriginal}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {showingOriginal ? "Ver reconstruida" : "Ver original"}
                  </button>
                ) : null}

                {verdict.notes.includes("foto_sin_mejorar") ? (
                  <p className="mt-1 text-[11px] text-text-faint">
                    No pudimos mejorar esta foto automáticamente — mostrando el recorte
                    original.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 min-w-0 flex-1 sm:mt-0">
              <GarmentAttributesEditor
                edits={edits}
                onEdit={onEdit}
                missing={verdict.missing}
                subcategoryHint={verdict.subcategoryHint}
                idPrefix={`review-${item.id}`}
              />
            </div>
          </div>

          {/* Los rótulos de GarmentAttributesEditor ya marcan CADA grupo que
              falta. Este resumen solo aparece cuando el usuario ya intentó
              guardar: ahí sí hace falta una frase que junte todo, porque el
              grupo que falta puede estar fuera de pantalla. */}
          {invalid && verdict.missing.length > 0 ? (
            <p role="alert" className="mt-4 rounded-md bg-danger-light px-3 py-2 text-xs font-medium text-danger">
              Falta {verdict.missing.join(", ")}.
            </p>
          ) : null}

          {verdict.notes.includes("posible_duplicado") ? (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-warning-light px-3 py-2">
              {duplicateUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={duplicateUrl}
                  alt=""
                  className="h-10 w-8 shrink-0 rounded object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-warning">¿Ya tienes esta?</p>
                <p className="text-[11px] text-warning">
                  Tienes una prenda parecida en tu armario.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-full border border-warning px-2.5 py-1 text-[11px] font-semibold text-warning hover:bg-warning hover:text-white"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={onDismissDuplicate}
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium text-warning underline"
                >
                  Guardar igual
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="ghost" size="md" onClick={onDelete}>
              Eliminar
            </Button>
            <Button size="md" onClick={onGoNext}>
              {nextAttentionId ? "Siguiente prenda" : "Listo"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
