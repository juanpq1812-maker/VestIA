import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import QuestForm from "@/components/admin/QuestForm";

export const metadata = {
  title: "Crear quest — Admin — StrandIA",
};

export default async function NewQuestPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/");

  const today = new Date();
  const inAMonth = new Date(today.getTime() + 30 * 86400000);

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} />
      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="md">
          <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
            Crear quest
          </h1>
          <QuestForm
            initial={{
              questType: "generate_outfits",
              title: "",
              description: "",
              targetCount: 3,
              windowDays: 7,
              pointsReward: 50,
              brandName: "",
              benefitDescription: "",
              startsAt: today.toISOString(),
              endsAt: inAMonth.toISOString(),
              isPublished: false,
            }}
          />
        </Container>
      </main>
    </div>
  );
}
