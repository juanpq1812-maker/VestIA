import { redirect, notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import QuestForm from "@/components/admin/QuestForm";
import type { QuestType } from "@/lib/community/constants";

export const metadata = {
  title: "Editar quest — Admin — StrandIA",
};

export default async function EditQuestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: quest } = await supabase
    .from("quests")
    .select(
      "id, quest_type, title, description, target_count, window_days, points_reward, brand_name, benefit_description, starts_at, ends_at, is_published"
    )
    .eq("id", id)
    .maybeSingle();

  if (!quest) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} />
      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="md">
          <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
            Editar quest
          </h1>
          <QuestForm
            initial={{
              id: quest.id,
              questType: quest.quest_type as QuestType,
              title: quest.title,
              description: quest.description,
              targetCount: quest.target_count,
              windowDays: quest.window_days,
              pointsReward: quest.points_reward,
              brandName: quest.brand_name ?? "",
              benefitDescription: quest.benefit_description ?? "",
              startsAt: quest.starts_at,
              endsAt: quest.ends_at,
              isPublished: quest.is_published,
            }}
          />
        </Container>
      </main>
    </div>
  );
}
