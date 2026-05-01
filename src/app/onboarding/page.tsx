// Onboarding (/onboarding). Por ahora es un placeholder; conserva el shell
// de la app para que se sienta parte del producto.

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import PaginaStub from "@/components/ui/PaginaStub";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PaginaStub
      titulo="Onboarding"
      descripcion="Aqui el usuario eligira su estilo y las ocasiones para las que viste, asi VestIA puede priorizar combinaciones relevantes."
      userEmail={user?.email}
      hideNav
    />
  );
}
