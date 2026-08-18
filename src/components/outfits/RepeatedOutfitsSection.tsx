// Seccion "Repetiste outfit?" en /outfits/saved.
//
// Muestra los 4 outfits USADOS mas recientes como "mini cards". Click en una
// registra uso del dia actual (mismo flujo que "Lo use hoy" de la card grande).
// Si el usuario nunca ha registrado uso, la seccion no se renderiza
// (ya filtramos en el server component).

"use client";

import { useState } from "react";
import { registerOutfitUseAction } from "@/app/outfits/actions";
import Toast from "@/components/ui/Toast";
import { lastUsedLabel, todayIso } from "@/lib/outfits/dateUtils";
import type { ClothingItem } from "@/types/database";

import { garmentSwatch } from "@/lib/ui/colors";
export type RepeatableOutfit = {
  id: string;
  name: string | null;
  /** Primera prenda con foto disponible — la usamos como portada. */
  cover: ClothingItem | null;
  lastUsedIso: string;
  /** Fechas ya registradas (para saber si "hoy" ya esta). */
  usedDates: string[];
};

type Props = {
  outfits: RepeatableOutfit[];
};

export default function RepeatedOutfitsSection({ outfits }: Props) {
  const [marcado, setMarcado] = useState<Record<string, boolean>>({});
  const [enProceso, setEnProceso] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" } | null>(null);

  if (outfits.length === 0) return null;

  async function onClick(outfit: RepeatableOutfit) {
    if (enProceso) return;
    const today = todayIso();
    if (marcado[outfit.id] || outfit.usedDates.includes(today)) {
      setToast({ msg: "Ya habías registrado este outfit hoy", kind: "success" });
      return;
    }
    setEnProceso(outfit.id);
    const res = await registerOutfitUseAction({
      outfitId: outfit.id,
      daysAgo: 0,
    });
    setEnProceso(null);
    if (res.ok) {
      setMarcado((m) => ({ ...m, [outfit.id]: true }));
      setToast({ msg: "¡Registrado! Lo usaste hoy", kind: "success" });
    } else if (res.code === "ALREADY_REGISTERED") {
      setMarcado((m) => ({ ...m, [outfit.id]: true }));
      setToast({ msg: "Ya habías registrado este outfit hoy", kind: "success" });
    } else {
      setToast({ msg: res.error, kind: "error" });
    }
  }

  return (
    <section
      aria-label="Repetiste outfit"
      className="mt-8 rounded-2xl border border-primary-mid/40 bg-primary-light/40 p-5"
    >
      <header className="mb-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-primary">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 2.1 21 6l-4 3.9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 21.9 3 18l4-3.9" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          ¿Repetiste outfit?
        </h2>
        <p className="text-xs text-text-muted">
          Marca rápida si volviste a usar uno de los recientes.
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {outfits.map((o) => {
          const yaHoy = marcado[o.id] || o.usedDates.includes(todayIso());
          const procesando = enProceso === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onClick(o)}
                disabled={procesando || yaHoy}
                className={[
                  "group flex w-full flex-col overflow-hidden rounded-xl border bg-surface text-left transition-all",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  yaHoy
                    ? "border-success/30 bg-success-light/40"
                    : "border-border hover:-translate-y-0.5 hover:border-primary-mid hover:shadow-md",
                  "disabled:cursor-not-allowed",
                ].join(" ")}
              >
                <div
                  className="relative aspect-square w-full overflow-hidden"
                  style={{
                    backgroundColor: garmentSwatch(o.cover?.primary_color),
                  }}
                >
                  {o.cover?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.cover.image_url}
                      alt={o.name ?? "Outfit"}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : null}
                  {yaHoy && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-white shadow">
                      <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 13 4 4 10-10" />
                      </svg>
                      Hoy
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-text">
                    {o.name?.trim() || "Outfit sin nombre"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    Última vez: {lastUsedLabel(o.lastUsedIso)}
                  </p>
                  {procesando && (
                    <p className="mt-1 text-[11px] text-primary">
                      Registrando...
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {toast && (
        <Toast
          message={toast.msg}
          kind={toast.kind}
          onDismiss={() => setToast(null)}
        />
      )}
    </section>
  );
}
