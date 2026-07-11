// /profile/help — Ayuda y soporte (Configuración del perfil).
//
// Server Component: FAQ estático + chatbot de soporte con IA (SupportChat).
// El FAQ cubre las dudas más comunes sin gastar llamadas de IA; el chat
// queda para preguntas que el FAQ no responde.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import SupportChat from "@/components/profile/SupportChat";

export const metadata = {
  title: "Ayuda y soporte — StrandIA",
};

const FAQ: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: "¿Cómo genero mi primer outfit?",
    respuesta:
      "Sube al menos 6 prendas en Armario (2 tops, 2 bottoms, 1 calzado y 1 accesorio) y entra a AI Studio. La IA combina tus prendas según los estilos y ocasiones que elegiste en el onboarding.",
  },
  {
    pregunta: "¿Cómo conecto mi calendario?",
    respuesta:
      "En Perfil → Calendario pega la URL iCal de tu calendario: en Google Calendar está en Configuración → Integrar el calendario (dirección secreta en formato iCal); en iCloud, activa \"Calendario público\" y copia el enlace. Puedes tener Google y Apple conectados a la vez.",
  },
  {
    pregunta: "¿Cómo cambio mis estilos o tallas?",
    respuesta:
      "En Perfil → Configuración → Estilo preferido puedes editar tus estilos, ocasiones, tallas y medidas cuando quieras.",
  },
  {
    pregunta: "¿Qué incluye el plan Free?",
    respuesta:
      "Outfits con IA desde tu armario, la recomendación de outfit del día y armario digital ilimitado. Hay un límite de 30 operaciones de IA por hora.",
  },
  {
    pregunta: "¿Por qué la IA dice que alcancé el límite?",
    respuesta:
      "Las operaciones de IA (generar outfits, analizar fotos y el chat de soporte) tienen un tope de 30 por hora por usuario. El contador se reinicia una hora después del primer uso.",
  },
];

export default async function HelpPage() {
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
            Ayuda y soporte
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Resuelve tus dudas con las preguntas frecuentes o pregúntale
            directamente al asistente.
          </p>

          {/* ── Chat de soporte ─────────────────────────────────────────── */}
          <section className="mt-8">
            <SupportChat />
          </section>

          {/* ── FAQ ─────────────────────────────────────────────────────── */}
          <section className="mt-10">
            <h2 className="font-display text-2xl font-bold text-text sm:text-3xl">
              Preguntas frecuentes
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              {FAQ.map(({ pregunta, respuesta }) => (
                <details
                  key={pregunta}
                  className="rounded-lg bg-surface-2 px-4 py-3 text-sm text-text-muted"
                >
                  <summary className="cursor-pointer font-semibold text-text">
                    {pregunta}
                  </summary>
                  <p className="mt-3">{respuesta}</p>
                </details>
              ))}
            </div>
          </section>
        </Container>
      </main>
    </div>
  );
}
