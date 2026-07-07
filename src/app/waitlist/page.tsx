// Pantalla de lista de espera.
//
// El Proxy garantiza que solo llegan aqui usuarios con sesion y sin aprobar
// (con `approved = true` redirige a "/", sin sesion a /login), asi que la
// pagina solo se ocupa de renderizar el mensaje. Sin navegacion: el usuario
// no tiene a donde ir dentro de la app todavia.

import type { Metadata } from "next";
import Logo from "@/components/ui/Logo";
import LogoutButton from "@/components/auth/LogoutButton";
import ShareButton from "@/components/waitlist/ShareButton";

export const metadata: Metadata = {
  title: "Estás en la lista — StrandIA",
};

export default function WaitlistPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-sm md:p-10">
        <div className="flex justify-center">
          <Logo size={56} />
        </div>

        <h1 className="mt-6 font-display text-3xl font-bold text-text sm:text-4xl">
          Estás en la lista{" "}
          <span aria-hidden="true">✨</span>
        </h1>

        <p className="mt-4 text-base text-text-muted">
          StrandIA está abriendo sus puertas poco a poco. Serás de los primeros
          en acceder cuando sea tu turno — te avisamos por correo.
        </p>
        <p className="mt-3 text-base text-text-muted">
          Mientras tanto, cuéntale a tus amigos.
        </p>

        <div className="mt-8">
          <ShareButton />
        </div>
      </div>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </main>
  );
}
