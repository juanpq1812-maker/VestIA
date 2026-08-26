// /profile/privacy — Privacidad (Configuración del perfil).
//
// Tres bloques:
//   1. Qué datos guarda StrandIA y para qué (transparencia).
//   2. Exportar mis datos — descarga un JSON vía /profile/privacy/export.
//   3. Zona de peligro — borrar la cuenta (DeleteAccountSection).

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import DeleteAccountSection from "@/components/profile/DeleteAccountSection";

export const metadata = {
  title: "Privacidad — StrandIA",
};

const DATOS: { titulo: string; detalle: string }[] = [
  {
    titulo: "Tu cuenta",
    detalle:
      "Email y nombre. Los usamos para identificarte y saludarte dentro de la app.",
  },
  {
    titulo: "Tus prendas y fotos",
    detalle:
      "Las fotos que subes se guardan en un bucket privado: solo tú puedes verlas, mediante enlaces firmados temporales. La IA las analiza para detectar categoría y color.",
  },
  {
    titulo: "Tus preferencias",
    detalle:
      "Estilos, ocasiones, tallas y medidas del onboarding. Solo se usan para personalizar los outfits que la IA genera para ti.",
  },
  {
    titulo: "Tu calendario (opcional)",
    detalle:
      "Si conectas un calendario, guardamos la URL ICS (secreta) y los próximos eventos para sugerirte outfits. Puedes desconectarlo cuando quieras desde Perfil → Calendario: al hacerlo borramos de inmediato la URL y los eventos guardados. También puedes revocar la URL desde tu proveedor.",
  },
];

export default async function PrivacyPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="md">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Volver al perfil
          </Link>

          <h1 className="mt-4 font-display text-3xl font-bold text-text sm:text-4xl">
            Privacidad
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Tus datos son tuyos: aquí puedes ver qué guardamos, descargarlo
            todo o borrar tu cuenta.
          </p>

          {/* ── Qué guardamos ───────────────────────────────────────────── */}
          <section className="mt-8">
            <h2 className="font-display text-2xl text-text">Qué guardamos</h2>
            <ul className="mt-4 divide-y divide-divider overflow-hidden rounded-xl bg-surface shadow-sm">
              {DATOS.map(({ titulo, detalle }) => (
                <li key={titulo} className="px-4 py-4">
                  <p className="text-sm font-semibold text-text">{titulo}</p>
                  <p className="mt-1 text-sm text-text-muted">{detalle}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-text-faint">
              No vendemos tus datos ni los compartimos con terceros. Las fotos
              se envían a la IA solo para analizarlas al subirlas. Los detalles
              completos están en la{" "}
              <Link
                href="/privacy-policy"
                className="font-medium text-text-muted underline underline-offset-4 hover:text-primary"
              >
                Política de Privacidad
              </Link>{" "}
              y los{" "}
              <Link
                href="/terms"
                className="font-medium text-text-muted underline underline-offset-4 hover:text-primary"
              >
                Términos y Condiciones
              </Link>
              .
            </p>
          </section>

          {/* ── Exportar ────────────────────────────────────────────────── */}
          <section className="mt-10">
            <h2 className="font-display text-2xl text-text">Exportar mis datos</h2>
            <div className="mt-4 flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-muted">
                Descarga un archivo JSON con tu perfil, preferencias, prendas,
                outfits, historial de uso y calendarios.
              </p>
              <a
                href="/profile/privacy/export"
                download
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary-light px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface-offset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                  <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
                Descargar JSON
              </a>
            </div>
          </section>

          {/* ── Borrar cuenta ───────────────────────────────────────────── */}
          <DeleteAccountSection />
        </Container>
      </main>
    </div>
  );
}
