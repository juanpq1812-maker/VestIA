// /comunidad — pantalla de comunidad (Design STRANDIA — strandia_comunidad).
//
// La funcionalidad social todavía no existe: esta pantalla presenta la
// estructura editorial del diseño (challenges, outfits de la comunidad,
// marcas aliadas) con todo lo no funcional marcado explícitamente como
// "Próximamente" — nada simula ser real.

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";

export const metadata = {
  title: "Comunidad — StrandIA",
};

const BENEFICIOS = [
  { marca: "Marcas de moda", detalle: "Descuentos exclusivos en básicos" },
  { marca: "Tiendas aliadas", detalle: "Envío gratis en tu primer pedido" },
  { marca: "Drops especiales", detalle: "Acceso anticipado a lanzamientos" },
];

export default async function ComunidadPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="lg">
          <h1 className="font-display text-3xl tracking-tight text-text sm:text-4xl">
            Comunidad
          </h1>
          <p className="mt-2 max-w-xl text-base text-text-muted">
            Challenges, outfits de otros usuarios y beneficios de marcas
            aliadas. Estamos construyendo esta sección.
          </p>

          {/* ── Challenges de uso ─────────────────────────────────────── */}
          <section className="mt-10">
            <SectionTitle>Challenges de uso</SectionTitle>
            <div className="mt-4 rounded-xl bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-text">Minimalismo de Otoño</h3>
                  <p className="mt-1 text-sm text-text-muted">
                    Crea 5 outfits usando solo prendas neutras
                  </p>
                </div>
                <ProximamenteBadge />
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Tu progreso</span>
                  <span>0/5 outfits</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={0}
                  aria-valuemin={0}
                  aria-valuemax={5}
                  aria-label="Progreso del challenge"
                  className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2"
                >
                  <div className="h-full w-0 rounded-full bg-primary" />
                </div>
              </div>
              <p className="mt-4 text-xs text-text-muted">
                Los challenges con ranking y puntos llegarán pronto — mientras
                tanto, cada outfit que uses ya cuenta en tus estadísticas.
              </p>
            </div>
          </section>

          {/* ── Outfits de la comunidad ───────────────────────────────── */}
          <section className="mt-10">
            <SectionTitle>Outfits de la comunidad</SectionTitle>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-xl bg-surface-2 p-4 text-center"
                >
                  <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-faint">
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
                    <circle cx="17" cy="9" r="2.4" />
                    <path d="M16.5 15.2c2.6.3 4.5 2.1 4.5 4.8" />
                  </svg>
                  <p className="text-xs text-text-muted">
                    Aquí verás los looks que comparta la comunidad
                  </p>
                  <ProximamenteBadge />
                </div>
              ))}
            </div>
          </section>

          {/* ── Marcas aliadas y beneficios ───────────────────────────── */}
          <section className="mt-10">
            <SectionTitle>Marcas aliadas y beneficios</SectionTitle>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Beneficios exclusivos
            </p>
            <ul className="mt-3 divide-y divide-divider overflow-hidden rounded-xl bg-surface shadow-sm">
              {BENEFICIOS.map((b) => (
                <li key={b.marca} className="flex items-center gap-4 px-4 py-4">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink text-white"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M2 7h20v5H2zM12 21V7M12 7c-1.5 0-4-1-4-3a2 2 0 0 1 4 0M12 7c1.5 0 4-1 4-3a2 2 0 0 0-4 0" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">{b.marca}</p>
                    <p className="truncate text-xs text-text-muted">{b.detalle}</p>
                  </div>
                  <ProximamenteBadge />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-text-muted">
              Estamos cerrando alianzas con marcas — los beneficios aparecerán
              aquí cuando estén activos.
            </p>
          </section>
        </Container>
      </main>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl text-text">{children}</h2>;
}

function ProximamenteBadge() {
  return (
    <span className="shrink-0 rounded-full bg-surface-offset px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
      Próximamente
    </span>
  );
}
