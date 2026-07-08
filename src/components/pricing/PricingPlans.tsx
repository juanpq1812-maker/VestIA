// Planes de pricing (UI only — los precios/checkout se conectarán a APIs
// después). Client Component por el toggle mensual/anual.
//
// Adaptación StrandIA del layout de referencia: 3 cards, la central
// "Popular" usa el verde tinta editorial (botón Inverted del design system).

"use client";

import { useId, useState } from "react";

type Plan = {
  nombre: string;
  precioMensual: number; // USD
  descripcion: string;
  features: string[];
  cta: string;
  popular?: boolean;
  esActual?: boolean;
};

const PLANES: Plan[] = [
  {
    nombre: "Free",
    precioMensual: 0,
    descripcion: "Perfecto para digitalizar tu armario",
    features: [
      "Armario digital ilimitado",
      "Outfits con IA (30 por hora)",
      "Recomendación de outfit del día",
      "Registro de usos y estadísticas",
    ],
    cta: "Tu plan actual",
    esActual: true,
  },
  {
    nombre: "Premium",
    precioMensual: 4.99,
    descripcion: "Ideal para vestir mejor todos los días",
    features: [
      "Todo lo del plan Free",
      "Outfits con IA ilimitados",
      "Inspiración con foto de referencia",
      "Challenges y ranking de comunidad",
      "Acceso anticipado a nuevas funciones",
    ],
    cta: "Empezar Premium",
    popular: true,
  },
  {
    nombre: "Pro",
    precioMensual: 9.99,
    descripcion: "Para creadores y estilistas",
    features: [
      "Todo lo del plan Premium",
      "Armarios de múltiples personas",
      "Beneficios de marcas aliadas",
      "Soporte prioritario",
    ],
    cta: "Empezar Pro",
  },
];

const DESCUENTO_ANUAL = 0.2;

export default function PricingPlans() {
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
          <span className="font-semibold text-primary">(ahorra 20%)</span>
        </label>
      </div>

      {/* ── Cards ────────────────────────────────────────────────────── */}
      <div className="mt-10 grid gap-6 lg:grid-cols-3 lg:items-center">
        {PLANES.map((plan) => (
          <PlanCard key={plan.nombre} plan={plan} anual={anual} />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-text-muted">
        Precios en USD. Los planes de pago estarán disponibles muy pronto —
        hoy todas las cuentas usan el plan Free.
      </p>
    </div>
  );
}

function PlanCard({ plan, anual }: { plan: Plan; anual: boolean }) {
  const precio = anual
    ? plan.precioMensual * (1 - DESCUENTO_ANUAL)
    : plan.precioMensual;
  const esGratis = plan.precioMensual === 0;
  const popular = Boolean(plan.popular);

  return (
    <article
      className={[
        "relative flex flex-col rounded-xl p-6 sm:p-8",
        popular
          ? "bg-ink text-white shadow-lg lg:scale-[1.04]"
          : "bg-surface shadow-sm",
      ].join(" ")}
    >
      {popular && (
        <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-text shadow-md">
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.4-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8L12 2Z" />
          </svg>
          Popular
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

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-4xl tracking-tight sm:text-5xl">
          {esGratis ? "Gratis" : `USD ${precio.toFixed(2).replace(/\.00$/, "")}`}
        </span>
        {!esGratis && (
          <span className={popular ? "text-sm text-white/70" : "text-sm text-text-muted"}>
            / mes
          </span>
        )}
      </div>
      {!esGratis && (
        <p className={["mt-1 text-xs", popular ? "text-white/70" : "text-text-muted"].join(" ")}>
          {anual ? "facturado anualmente" : "facturado mensualmente"}
        </p>
      )}

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
          disabled={plan.esActual}
          aria-disabled={plan.esActual}
          title={plan.esActual ? undefined : "Disponible muy pronto"}
          className={[
            "w-full rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out",
            "focus-visible:outline-2 focus-visible:outline-offset-2",
            plan.esActual
              ? "cursor-default bg-surface-2 text-text-muted"
              : popular
                ? "bg-white text-ink shadow-sm hover:-translate-y-px hover:shadow-md active:translate-y-0 focus-visible:outline-white"
                : "border border-ink bg-transparent text-text hover:bg-surface-2 active:bg-surface-offset focus-visible:outline-primary",
          ].join(" ")}
        >
          {plan.cta}
        </button>
        {!plan.esActual && (
          <p
            className={[
              "mt-3 text-center text-xs",
              popular ? "text-white/60" : "text-text-faint",
            ].join(" ")}
          >
            Disponible muy pronto
          </p>
        )}
      </div>
    </article>
  );
}
