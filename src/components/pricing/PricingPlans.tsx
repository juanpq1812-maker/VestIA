// Planes de pricing — StrandIA Free / Premium.
//
// Lee los números de src/lib/plans/constants.ts, la misma fuente que usan
// los gates y el paywall: si el precio o la cuota cambian, cambian acá solo.
// Sin botón de pago funcional todavía (no hay Wompi) — el CTA de Premium va
// deshabilitado con "Próximamente", nunca un botón que no hace nada.
//
// Client Component por el toggle mensual/anual.

"use client";

import { useId, useState } from "react";
import {
  FREE_MONTHLY_GENERATIONS,
  FREE_PHOTO_IMPROVEMENTS,
  PREMIUM_PRICE_MONTHLY_COP,
  PREMIUM_PRICE_YEARLY_COP,
} from "@/lib/plans/constants";

type Plan = {
  nombre: string;
  descripcion: string;
  features: string[];
  esPremium: boolean;
};

const PLANES: Plan[] = [
  {
    nombre: "Free",
    descripcion: "Perfecto para digitalizar tu armario",
    features: [
      "Armario digital ilimitado",
      `${FREE_MONTHLY_GENERATIONS} outfits con IA al mes`,
      `${FREE_PHOTO_IMPROVEMENTS} mejoras de foto`,
      "Moodboard básico",
      "Hebri, El Hilo y comunidad completos",
    ],
    esPremium: false,
  },
  {
    nombre: "Premium",
    descripcion: "Ideal para vestir mejor todos los días, sin límites",
    features: [
      "Todo lo de Free, sin límites",
      "Outfits con IA sin cuota mensual",
      "Mejoras de foto ilimitadas",
      "Flat lay editorial con IA (próximamente)",
      "Vestir a Hebri (próximamente)",
    ],
    esPremium: true,
  },
];

function formatCOP(cop: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(cop);
}

// Ahorro real de pagar anual vs. 12 meses al precio mensual — calculado, no
// inventado, para que nunca se desincronice de constants.ts.
const AHORRO_ANUAL_PCT = Math.round(
  (1 - PREMIUM_PRICE_YEARLY_COP / 12 / PREMIUM_PRICE_MONTHLY_COP) * 100
);

type Props = {
  /** Plan actual del usuario, evaluado en el servidor. `null` si no hay sesión. */
  isPremium?: boolean | null;
};

export default function PricingPlans({ isPremium = false }: Props) {
  const [anual, setAnual] = useState(false);
  const toggleId = useId();

  return (
    <div>
      {/* ── Toggle mensual/anual ─────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3">
        <button
          id={toggleId}
          type="button"
          role="switch"
          aria-checked={anual}
          onClick={() => setAnual((v) => !v)}
          className={[
            "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            anual ? "bg-primary" : "bg-surface-2 border border-border",
          ].join(" ")}
        >
          <span
            aria-hidden="true"
            className={[
              "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200",
              anual ? "translate-x-[26px]" : "translate-x-[3px]",
            ].join(" ")}
          />
        </button>
        <label htmlFor={toggleId} className="cursor-pointer text-sm font-medium text-text">
          Facturación anual{" "}
          <span className="font-semibold text-primary">(ahorra {AHORRO_ANUAL_PCT}%)</span>
        </label>
      </div>

      {/* ── Cards ────────────────────────────────────────────────────── */}
      <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2 sm:items-center">
        {PLANES.map((plan) => (
          <PlanCard
            key={plan.nombre}
            plan={plan}
            anual={anual}
            esActual={plan.esPremium ? Boolean(isPremium) : !isPremium}
          />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-text-muted">
        Precios en pesos colombianos (COP). El cobro con Premium llega
        pronto — hoy todas las cuentas nuevas usan el plan Free.
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  anual,
  esActual,
}: {
  plan: Plan;
  anual: boolean;
  esActual: boolean;
}) {
  const popular = plan.esPremium;

  return (
    <article
      className={[
        "relative flex flex-col rounded-xl p-6 sm:p-8",
        popular ? "bg-ink text-white shadow-lg sm:scale-[1.04]" : "bg-surface shadow-sm",
      ].join(" ")}
    >
      {popular && (
        <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-text shadow-md">
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.4-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8L12 2Z" />
          </svg>
          Recomendado
        </span>
      )}

      <h3
        className={[
          "text-sm font-semibold uppercase tracking-widest",
          popular ? "text-white/80" : "text-text-muted",
        ].join(" ")}
      >
        {plan.nombre}
      </h3>
      <p className={["mt-1 text-sm", popular ? "text-white/70" : "text-text-muted"].join(" ")}>
        {plan.descripcion}
      </p>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-4xl tracking-tight sm:text-5xl">
          {plan.esPremium
            ? `$${formatCOP(anual ? PREMIUM_PRICE_YEARLY_COP : PREMIUM_PRICE_MONTHLY_COP)}`
            : "Gratis"}
        </span>
        {plan.esPremium && (
          <span className={popular ? "text-sm text-white/70" : "text-sm text-text-muted"}>
            COP / {anual ? "año" : "mes"}
          </span>
        )}
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={["mt-0.5 shrink-0", popular ? "text-primary-mid" : "text-primary"].join(" ")}
            >
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
            <span className={popular ? "text-white/90" : "text-text"}>{f}</span>
          </li>
        ))}
      </ul>

      <div className={["mt-8 border-t pt-6", popular ? "border-white/15" : "border-divider"].join(" ")}>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title={esActual ? "Ya tienes este plan" : "Disponible muy pronto"}
          className={[
            "w-full cursor-default rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out",
            popular ? "bg-white/15 text-white/70" : "bg-surface-2 text-text-muted",
          ].join(" ")}
        >
          {esActual ? "Tu plan actual" : "Próximamente"}
        </button>
        {!esActual && (
          <p
            className={[
              "mt-3 text-center text-xs",
              popular ? "text-white/60" : "text-text-faint",
            ].join(" ")}
          >
            Todavía no puedes pagar desde acá — te avisamos apenas esté listo.
          </p>
        )}
      </div>
    </article>
  );
}
