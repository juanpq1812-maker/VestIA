"use client";

import { useMemo } from "react";
import type { WardrobeSummary } from "@/lib/outfits/tiendas";
import { getTiendasMixtas, buildStoreUrl } from "@/lib/outfits/tiendas";

type Sugerencia = {
  emoji: string;
  tipo: string;
  termino: string;
  categoria: string;
};

function getSugerencias(s: WardrobeSummary): Sugerencia[] {
  const result: Sugerencia[] = [];

  if ((s.footwear ?? 0) === 0) {
    result.push({
      emoji: "👟",
      tipo: "Calzado deportivo",
      termino: "calzado deportivo",
      categoria: "footwear",
    });
  }
  if ((s.outerwear ?? 0) === 0) {
    result.push({
      emoji: "🧥",
      tipo: "Abrigo",
      termino: "abrigo",
      categoria: "outerwear",
    });
  }
  const hasDress = (s.dress ?? 0) >= 2;
  if ((s.bottom ?? 0) < 2 && !hasDress) {
    result.push({
      emoji: "👖",
      tipo: "Pantalón casual",
      termino: "pantalon casual",
      categoria: "bottom",
    });
  }
  if ((s.top ?? 0) < 3 && !hasDress) {
    result.push({
      emoji: "👕",
      tipo: "Camiseta básica",
      termino: "camiseta basica",
      categoria: "top",
    });
  }

  return result.slice(0, 3);
}

export default function WardrobeCompletionSection({
  summary,
}: {
  summary: WardrobeSummary;
}) {
  const sugerencias = useMemo(() => getSugerencias(summary), [summary]);

  if (sugerencias.length === 0) return null;

  const totalItems = Object.values(summary).reduce(
    (acc, v) => acc + (v ?? 0),
    0
  );
  const potencial = Math.max(
    20,
    (totalItems + sugerencias.length) * sugerencias.length * 3
  );
  const label = potencial > 20 ? "20+" : `${potencial}`;

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-text">
          💡 Completa tu armario
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Con estas prendas podrías generar {label} outfits nuevos
        </p>
      </div>

      <div className="space-y-5">
        {sugerencias.map((sug, i) => {
          const tiendas = getTiendasMixtas(sug.categoria);
          return (
            <div key={i}>
              <p className="mb-2 text-sm font-semibold text-text">
                {sug.emoji}{" "}
                <span className="font-normal text-text-muted">Te falta:</span>{" "}
                {sug.tipo}
              </p>
              <div className="flex flex-wrap gap-2">
                {tiendas.map((tienda) => (
                  <a
                    key={tienda.nombre}
                    href={buildStoreUrl(tienda, sug.termino)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-primary-light hover:text-primary"
                  >
                    {tienda.logo} {tienda.nombre}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
