// /pricing — planes de StrandIA. Solo UI por ahora: el checkout y la
// conexión con la API de pagos llegan después. El CTA "Upgrade a Premium"
// del perfil apunta aquí.

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import PricingPlans from "@/components/pricing/PricingPlans";
import { getUserPlan } from "@/lib/plans/getUserPlan";

export const metadata = {
  title: "Planes — StrandIA",
};

export default async function PricingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const planInfo = user ? await getUserPlan(user.id, supabase) : null;

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="lg">
          <header className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-3xl tracking-tight text-text sm:text-5xl">
              Precios simples y transparentes
            </h1>
            <p className="mt-4 text-base text-text-muted">
              Elige el plan que funcione para ti. Todos incluyen tu armario
              digital y outfits generados con IA.
            </p>
          </header>

          <div className="mt-10">
            <PricingPlans isPremium={planInfo?.isPremium} />
          </div>
        </Container>
      </main>
    </div>
  );
}
