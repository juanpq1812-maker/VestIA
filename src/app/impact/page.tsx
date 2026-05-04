// /impact — pantalla de impacto ambiental de VestIA.
//
// Server Component: hacemos UNA sola query con HEAD + count exacto sobre
// `outfit_uses` para saber cuantos usos reales tiene el usuario. Esa cifra
// alimenta los 3 numeros (CO2, arboles, agua) via `computeImpact`.
//
// Bifurcacion de UI:
//   - usos === 0  -> pantalla motivacional con proyeccion a 1 ano + CTA.
//   - usos >= 1   -> pantalla con datos reales + numero "heroe" animado.
//
// Toda la matematica vive en `lib/impact/calculations.ts` para mantener la
// pagina legible y poder reutilizar los factores en el futuro.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CountUpNumber from "@/components/impact/CountUpNumber";
import {
  computeImpact,
  formatEsNumber,
  projectedImpact,
  PROJECTED_USES_PER_YEAR,
  CO2_KG_PER_USE,
  WATER_LITERS_PER_USE,
} from "@/lib/impact/calculations";

const FUENTE = "Fuente: ONU Environment 2024 — Industria Textil";

export default async function ImpactPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Profile (display_name) en paralelo con el count: son tablas distintas y
  // no se bloquean entre si.
  const [profileRes, usesCountRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("outfit_uses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user?.id ?? ""),
  ]);

  const displayName = profileRes.data?.display_name ?? null;
  const uses = usesCountRes.count ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} displayName={displayName} />
      <main className="flex-1 py-10 sm:py-14">
        <Container size="md">
          <header className="text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              Tu impacto positivo
            </p>
          </header>

          <div className="mt-8">
            {uses === 0 ? <EmptyImpact /> : <RealImpact uses={uses} />}
          </div>

          <p className="mt-10 text-center text-xs text-text-faint">{FUENTE}</p>
        </Container>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CASO 1: usuario CON datos. Numero gigante animado + 2 datos secundarios.
// ---------------------------------------------------------------------------

function RealImpact({ uses }: { uses: number }) {
  const { co2Kg, trees, waterLiters } = computeImpact(uses);

  return (
    <Card padding="lg" className="text-center">
      {/* Icono heroe */}
      <div
        aria-hidden="true"
        className="mx-auto flex h-24 w-24 items-center justify-center text-7xl"
      >
        🌳
      </div>

      {/* Numero heroe */}
      <h1 className="mt-4 font-display text-5xl font-bold leading-none text-text sm:text-6xl">
        <CountUpNumber value={co2Kg} />
        <span className="ml-2 text-2xl font-semibold text-text-muted sm:text-3xl">
          kg
        </span>
      </h1>
      <p className="mt-3 text-base font-medium text-text sm:text-lg">
        de CO<sub>2</sub> evitados
      </p>

      <p className="mt-2 text-sm text-text-muted">
        ≈ <span className="font-semibold text-text">{formatEsNumber(trees)}</span>{" "}
        {trees === 1 ? "arbol plantado" : "arboles plantados"} al ano
      </p>

      {/* Microcopy */}
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-text-muted">
        Cada outfit que armas con tu armario evita producir ropa nueva.
      </p>

      {/* Separador */}
      <div className="mt-8 flex items-center gap-3 text-xs uppercase tracking-widest text-text-faint">
        <span className="h-px flex-1 bg-divider" />
        Detalles
        <span className="h-px flex-1 bg-divider" />
      </div>

      {/* Datos secundarios */}
      <dl className="mt-6 grid gap-4 text-left sm:grid-cols-2">
        <SecondaryStat
          icon="💧"
          value={`${formatEsNumber(waterLiters)} L`}
          label="de agua ahorrados"
        />
        <SecondaryStat
          icon="✨"
          value={`${formatEsNumber(uses)}`}
          label={uses === 1 ? "outfit realmente usado" : "outfits realmente usados"}
        />
      </dl>
    </Card>
  );
}

function SecondaryStat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-2 p-4">
      <span aria-hidden="true" className="text-2xl">
        {icon}
      </span>
      <div>
        <dt className="text-base font-semibold text-text">{value}</dt>
        <dd className="text-xs text-text-muted">{label}</dd>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CASO 2: usuario SIN datos. Mensaje motivacional + proyeccion + CTA.
// ---------------------------------------------------------------------------

function EmptyImpact() {
  const { co2Kg, trees, waterLiters } = projectedImpact();

  return (
    <Card padding="lg" className="text-center">
      {/* Icono motivacional con pulso suave (CSS puro). */}
      <div
        aria-hidden="true"
        className="mx-auto flex h-24 w-24 animate-pulse items-center justify-center text-7xl"
      >
        🌱
      </div>

      <h1 className="mt-4 font-display text-3xl font-bold text-text sm:text-4xl">
        Tu impacto esta esperando
      </h1>

      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-text-muted">
        Cada outfit que uses con tu armario en vez de comprar ropa nueva,
        evitas producir{" "}
        <span className="font-semibold text-text">{CO2_KG_PER_USE} kg</span> de
        CO<sub>2</sub> y ahorras{" "}
        <span className="font-semibold text-text">
          {formatEsNumber(WATER_LITERS_PER_USE)} L
        </span>{" "}
        de agua.
      </p>

      {/* Separador */}
      <div className="mt-8 flex items-center gap-3 text-xs uppercase tracking-widest text-text-faint">
        <span className="h-px flex-1 bg-divider" />
        Tu potencial en 1 ano
        <span className="h-px flex-1 bg-divider" />
      </div>

      {/* Proyeccion: 3 numeros destacados */}
      <ul className="mt-6 grid gap-3 text-left">
        <ProjectedRow
          icon="🌍"
          value={`${formatEsNumber(co2Kg)} kg`}
          label="de CO2 evitados"
        />
        <ProjectedRow
          icon="🌳"
          value={`${formatEsNumber(trees)}`}
          label="arboles equivalentes"
        />
        <ProjectedRow
          icon="💧"
          value={`${formatEsNumber(waterLiters)} L`}
          label="de agua ahorrados"
        />
      </ul>

      <p className="mt-4 text-xs text-text-faint">
        Basado en uso de 3 outfits por semana ({PROJECTED_USES_PER_YEAR} al ano).
      </p>

      {/* CTA */}
      <div className="mt-8 flex justify-center">
        <Link href="/outfits" aria-label="Ir a generar outfits con IA">
          <Button variant="primary" size="lg">
            ✨ Generar mi primer outfit
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function ProjectedRow({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <li className="flex items-center gap-4 rounded-lg bg-primary-light/60 p-4">
      <span aria-hidden="true" className="text-3xl">
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-xl font-bold text-primary sm:text-2xl">{value}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </li>
  );
}
