// Confirmación de los recortes que detectó Vision en una foto de outfit
// completo, ANTES de gastar Gemini en ellos.
//
// POR QUÉ: Vision saca bounding boxes de cosas que no siempre son prendas (un
// bolso del fondo, un pedazo de pared, la mitad de otra persona). Hasta ahora
// esos recortes basura pasaban por Gemini igual que los buenos — COP 110 cada
// uno — y el usuario recién los descartaba en el review, cuando el gasto ya
// estaba hecho. Este paso invierte el orden: primero se pregunta, después se
// paga.
//
// Los recortes se muestran CRUDOS (sin fondo removido): es lo único que existe
// en este punto del flujo. Por eso el copy pregunta cuáles quiere agregar y no
// "revisa el resultado" — se está pidiendo una decisión de inclusión, no un
// juicio sobre la calidad de una imagen que todavía no se procesó.

"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { ExtractedCrop } from "@/lib/wardrobe/outfitExtraction";

type Props = {
  crops: ExtractedCrop[];
  onConfirm: (seleccionados: ExtractedCrop[], descartados: ExtractedCrop[]) => void;
  submitting?: boolean;
};

export default function OutfitCropConfirm({ crops, onConfirm, submitting = false }: Props) {
  // Todos marcados por defecto: el caso común es que la detección esté bien, y
  // obligar a marcar N prendas convertiría el ahorro en fricción.
  const [seleccion, setSeleccion] = useState<Set<string>>(
    () => new Set(crops.map((c) => c.item.id))
  );

  // Los object URL se crean una sola vez por recorte y se revocan al
  // desmontar — si no, cada render filtra memoria del blob.
  const previews = useMemo(
    () => crops.map((c) => ({ id: c.item.id, url: URL.createObjectURL(c.crop), crop: c })),
    [crops]
  );
  useEffect(() => {
    return () => {
      for (const p of previews) URL.revokeObjectURL(p.url);
    };
  }, [previews]);

  function toggle(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const elegidos = crops.filter((c) => seleccion.has(c.item.id));
  const descartados = crops.filter((c) => !seleccion.has(c.item.id));

  return (
    <Card padding="md">
      <h2 className="font-display text-xl font-bold text-text sm:text-2xl">
        ¿Cuáles de estas quieres agregar?
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Encontramos {crops.length}{" "}
        {crops.length === 1 ? "prenda" : "prendas"} en tus fotos. Desmarca lo que
        no sea ropa tuya — así no perdemos tiempo procesándolo.
      </p>

      <div
        role="group"
        aria-label="Prendas detectadas"
        className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4"
      >
        {previews.map(({ id, url, crop }, i) => {
          const activo = seleccion.has(id);
          return (
            <button
              key={id}
              type="button"
              role="checkbox"
              aria-checked={activo}
              disabled={submitting}
              onClick={() => toggle(id)}
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              className={[
                "group relative overflow-hidden rounded-xl border-2 transition-all duration-200",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                "motion-safe:animate-[fadeInUp_200ms_ease-out_backwards]",
                activo
                  ? "border-primary shadow-sm"
                  : "border-border opacity-45 grayscale",
                submitting ? "pointer-events-none" : "",
              ].join(" ")}
            >
              <span className="block aspect-square w-full bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={crop.item.subcategory ?? "Prenda detectada"}
                  className="h-full w-full object-cover"
                />
              </span>

              {/* Marca de selección */}
              <span
                aria-hidden="true"
                className={[
                  "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                  activo
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface/90 text-transparent",
                ].join(" ")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </span>

              {crop.item.subcategory ? (
                <span className="absolute inset-x-0 bottom-0 truncate bg-surface/90 px-1.5 py-1 text-[11px] font-medium text-text backdrop-blur">
                  {crop.item.subcategory}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted" aria-live="polite">
          {elegidos.length === 0
            ? "No seleccionaste ninguna."
            : `${elegidos.length} de ${crops.length} ${elegidos.length === 1 ? "seleccionada" : "seleccionadas"}`}
        </p>
        <Button
          onClick={() => onConfirm(elegidos, descartados)}
          disabled={elegidos.length === 0 || submitting}
          isLoading={submitting}
          loadingText="Procesando…"
        >
          {elegidos.length === crops.length
            ? "Agregar todas"
            : `Agregar ${elegidos.length}`}
        </Button>
      </div>
    </Card>
  );
}
