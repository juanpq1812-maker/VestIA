// Barra de progreso de onboarding en el armario.
//
// Se muestra solo cuando el usuario tiene menos de TARGET prendas.
// Desaparece automáticamente al alcanzar el objetivo (re-render del server).
// Click en la barra → /wardrobe/upload.

"use client";

import { useRouter } from "next/navigation";

const TARGET = 6;

type Props = {
  itemCount: number;
};

export default function OnboardingProgressBar({ itemCount }: Props) {
  const router = useRouter();

  // No renderizar si ya alcanzó el objetivo
  if (itemCount >= TARGET) return null;

  const pct = Math.round((itemCount / TARGET) * 100);
  const restantes = TARGET - itemCount;

  return (
    <button
      type="button"
      onClick={() => router.push("/wardrobe/upload")}
      className="mb-6 w-full rounded-xl border border-primary-mid bg-primary-light px-4 py-3 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label="Subir más prendas para completar el objetivo inicial"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-primary">
          {itemCount} de {TARGET} prendas
        </span>
        <span className="text-text-muted text-xs">
          ¡Subí {restantes} más y generá tu primer outfit!
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary-mid/30">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="mt-1.5 text-xs text-primary/80">
        Toca para agregar una prenda →
      </p>
    </button>
  );
}
