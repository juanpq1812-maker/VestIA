// Pagina de onboarding (/onboarding).
//
// Server Component minimal: solo monta el Header (sin nav, porque el usuario
// aun no ha completado el setup) y delega toda la interaccion al Client
// Component `OnboardingFlow`.
//
// La proteccion de la ruta y el "ya completaste, vete a /wardrobe" la maneja
// el Proxy (`src/proxy.ts`).

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensa en profundidad: si por algun motivo el Proxy no atrapo la ausencia
  // de sesion, redirigimos aqui. Un usuario sin sesion nunca deberia llegar.
  if (!user) {
    redirect("/login");
  }

  // Si el usuario YA termino el onboarding, no tiene sentido mostrarselo otra
  // vez — lo mandamos al armario.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} hideNav />
      <OnboardingFlow />
    </div>
  );
}
