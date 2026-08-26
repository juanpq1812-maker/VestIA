// /profile/blocked — Cuentas bloqueadas (Configuración del perfil).
//
// Requisito de App Store y Play para apps con contenido generado por usuarios:
// no basta con poder bloquear, tiene que existir un lugar donde ver a quién
// bloqueaste y deshacerlo. La lista y el desbloqueo están en
// BlockedUsersList (cliente); acá solo se resuelve la sesión y la query.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import BlockedUsersList from "@/components/profile/BlockedUsersList";
import { getBlockedUsers } from "@/lib/community/query";

export const metadata = {
  title: "Cuentas bloqueadas — StrandIA",
};

export default async function BlockedPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const bloqueados = await getBlockedUsers(supabase, user.id);

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} />

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
            Cuentas bloqueadas
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            No ves los looks de estas personas en la comunidad y ellas tampoco
            ven los tuyos. Nunca les avisamos que las bloqueaste.
          </p>

          <BlockedUsersList bloqueados={bloqueados} />

          <p className="mt-6 text-xs text-text-faint">
            Al desbloquear a alguien no se restauran los seguimientos que se
            borraron al bloquearla. Si se quieren volver a seguir, háganlo
            desde la comunidad.
          </p>
        </Container>
      </main>
    </div>
  );
}
