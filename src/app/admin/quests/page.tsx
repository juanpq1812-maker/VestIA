// /admin/quests — panel de administración del catálogo de Fashion Quests.
//
// Protegida a nivel de página (no en src/proxy.ts): Server Component que lee
// profiles.is_admin y redirige si no corresponde. is_admin se activa a mano
// desde el SQL Editor de Supabase — no hay flujo de auto-servicio.

import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { QUEST_TYPE_LABEL, type QuestType } from "@/lib/community/constants";
import { toggleQuestPublishedAction } from "./actions";

export const metadata = {
  title: "Admin · Quests — StrandIA",
};

export default async function AdminQuestsPage() {
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

  const { data: quests } = await supabase
    .from("quests")
    .select(
      "id, title, quest_type, target_count, window_days, points_reward, brand_name, is_published, starts_at, ends_at"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="lg">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
              Fashion Quests
            </h1>
            <Link href="/admin/quests/new">
              <Button>Crear quest</Button>
            </Link>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Catálogo administrado — el progreso de cada usuario se verifica
            con sus datos reales al reclamar (ver `complete_quest` en Supabase).
          </p>

          <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            {(quests ?? []).length === 0 ? (
              <p className="p-6 text-sm text-text-muted">
                No hay quests todavía. Creá el primero.
              </p>
            ) : (
              <ul className="divide-y divide-divider">
                {(quests ?? []).map((q) => (
                  <li key={q.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-text">{q.title}</p>
                        <span
                          className={[
                            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            q.is_published
                              ? "bg-success-light text-success"
                              : "bg-surface-2 text-text-muted",
                          ].join(" ")}
                        >
                          {q.is_published ? "Publicado" : "Borrador"}
                        </span>
                        {q.brand_name ? (
                          <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                            {q.brand_name}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        {QUEST_TYPE_LABEL[q.quest_type as QuestType]} · meta {q.target_count} en{" "}
                        {q.window_days} días · {q.points_reward} pts ·{" "}
                        {new Date(q.starts_at).toLocaleDateString("es-CO")} –{" "}
                        {new Date(q.ends_at).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <form
                        action={async () => {
                          "use server";
                          await toggleQuestPublishedAction(q.id, !q.is_published);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-text transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          {q.is_published ? "Despublicar" : "Publicar"}
                        </button>
                      </form>
                      <Link
                        href={`/admin/quests/${q.id}`}
                        className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-text transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Editar
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
