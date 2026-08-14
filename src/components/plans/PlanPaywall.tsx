// Paywall suave: reemplaza el boton/error cuando el plan free se queda sin
// cuota (outfits del mes o mejoras de foto). Nunca bloquea con un mensaje de
// error crudo — muestra que hay una razon de producto detras del limite y
// que se está perdiendo con free, con precio y sin boton de pago (todavia no
// hay procesador; un boton que no hace nada es peor que no tener boton).

import type { ReactNode } from "react";
import { PREMIUM_PRICE_MONTHLY_COP, PREMIUM_PRICE_YEARLY_COP } from "@/lib/plans/constants";

const BENEFICIOS_PREMIUM = [
  "Outfits ilimitados, sin cuota mensual",
  "Mejoras de foto ilimitadas",
  "Flat lay editorial con IA (próximamente)",
  "Vestir a Hebri (próximamente)",
] as const;

function formatCOP(cop: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(cop);
}

type Props = {
  title: string;
  subtitle: string;
  /** Imagen de ejemplo (el cuaderno) — vale más que la lista de texto sola.
   * Opcional: el paywall de "Mejora esta foto" no la necesita. */
  exampleImage?: ReactNode;
};

export default function PlanPaywall({ title, subtitle, exampleImage }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-primary-mid bg-surface">
      <div className="border-b border-border bg-primary-light px-6 py-6 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Límite del plan free
        </p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-text">
          {title}
        </h3>
        <p className="mt-1.5 text-sm text-text-muted">{subtitle}</p>
      </div>

      <div className="px-6 py-6 sm:px-8">
        {exampleImage && (
          <div className="mx-auto mb-5 max-w-[220px]">{exampleImage}</div>
        )}
        <p className="text-sm font-semibold text-text">
          Con StrandIA Premium te estás perdiendo
        </p>
        <ul className="mt-3 space-y-2.5">
          {BENEFICIOS_PREMIUM.map((beneficio) => (
            <li key={beneficio} className="flex items-start gap-2.5 text-sm text-text-muted">
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0 text-primary"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {beneficio}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-display text-2xl font-semibold text-text">
            ${formatCOP(PREMIUM_PRICE_MONTHLY_COP)}
          </span>
          <span className="text-sm text-text-muted">
            COP/mes · ${formatCOP(PREMIUM_PRICE_YEARLY_COP)}/año
          </span>
        </div>

        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Próximamente
        </span>
      </div>
    </div>
  );
}
