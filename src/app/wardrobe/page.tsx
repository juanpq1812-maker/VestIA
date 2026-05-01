// Pagina del armario (/wardrobe). Server Component: leemos el usuario actual
// del servidor de Supabase y se lo pasamos al Header.
//
// La proteccion principal de la ruta la hace el Proxy (`src/proxy.ts`): si no hay
// sesion, redirige a /login antes de llegar aqui. Aun asi, validamos el usuario aqui
// como buena practica (defensa en profundidad).

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const stats = [
  { numero: "0", etiqueta: "Prendas" },
  { numero: "0", etiqueta: "Outfits" },
  { numero: "0", etiqueta: "kg CO₂" },
];

export default async function WardrobePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const saludo = user?.email?.split("@")[0] ?? "tu";

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} />

      <main className="flex-1 py-10 sm:py-14">
        <Container size="lg">
          {/* Saludo + CTA principal */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-text-muted">Hola de nuevo 👋</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-text sm:text-4xl">
                {saludo}
              </h1>
              <p className="mt-2 max-w-xl text-base text-text-muted">
                Empieza por catalogar tus primeras prendas para que VestIA pueda
                generarte outfits.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/wardrobe/upload">
                <Button variant="primary" size="md">
                  + Agregar prenda
                </Button>
              </Link>
              <Link href="/outfits" className="hidden sm:inline-block">
                <Button variant="secondary" size="md">
                  Pedir outfit
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero card de "outfit del dia" placeholder. */}
          <div
            className="relative mt-8 overflow-hidden rounded-xl p-6 shadow-md sm:p-8"
            style={{
              background:
                "linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)",
            }}
          >
            <div
              className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-12 right-10 h-24 w-24 rounded-full bg-white/10"
              aria-hidden="true"
            />
            <p className="text-xs font-semibold uppercase tracking-widest text-white/75">
              Outfit sugerido hoy
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">
              Aun no hay outfits
            </h2>
            <p className="mt-2 max-w-lg text-sm text-white/85">
              Sube al menos 4 prendas y la IA empezara a combinarlas para ti.
            </p>
            <div className="mt-5">
              <Link href="/wardrobe/upload">
                <Button
                  size="md"
                  className="!bg-white !text-primary hover:!bg-white hover:!shadow-lg"
                >
                  Subir mi primera prenda
                </Button>
              </Link>
            </div>
          </div>

          {/* Estadisticas (placeholder hasta que haya datos reales). */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {stats.map((s) => (
              <Card key={s.etiqueta} padding="sm" className="text-center">
                <div className="font-display text-3xl font-bold text-primary">
                  {s.numero}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-text-muted">
                  {s.etiqueta}
                </div>
              </Card>
            ))}
          </div>

          {/* Estado vacio del grid de prendas. */}
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">Mi armario</h2>
              <span className="text-xs text-text-muted">0 prendas</span>
            </div>

            <div className="mt-4 rounded-xl border-2 border-dashed border-border bg-surface-2 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-text">
                Tu armario esta vacio
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
                Cuando subas prendas, apareceran aqui en una cuadricula con
                filtros por categoria.
              </p>
              <div className="mt-6 flex justify-center">
                <Link href="/wardrobe/upload">
                  <Button variant="primary">Agregar primera prenda</Button>
                </Link>
              </div>
            </div>
          </section>

          {user?.email ? (
            <p className="mt-10 text-center text-xs text-text-muted">
              Sesion activa como{" "}
              <span className="font-medium text-text">{user.email}</span>
            </p>
          ) : null}
        </Container>
      </main>
    </div>
  );
}
