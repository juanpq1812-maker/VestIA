// /comunidad — pantalla de comunidad (Design STRANDIA — strandia_comunidad).
//
// La funcionalidad social todavía no existe: esta pantalla presenta la
// estructura editorial del diseño (challenges, outfits de la comunidad,
// marcas aliadas) con todo lo no funcional marcado explícitamente como
// "Próximamente" — nada simula ser real.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import QuestCard from "@/components/community/QuestCard";
import CommunityShareCard from "@/components/community/CommunityShareCard";
import EditorialPostCard from "@/components/editorial/EditorialPostCard";
import {
  getQuestsWithProgress,
  getCommunityPoints,
  getCommunityFeed,
} from "@/lib/community/query";
import { levelFromPoints } from "@/lib/community/constants";
import { getLatestPublishedPosts } from "@/lib/editorial/query";

export const metadata = {
  title: "Comunidad — StrandIA",
};

const HILO_PREVIEW_COUNT = 3;

export default async function ComunidadPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [quests, points, feed, hiloPosts] = user
    ? await Promise.all([
        getQuestsWithProgress(supabase, user.id),
        getCommunityPoints(supabase, user.id),
        getCommunityFeed(supabase, user.id),
        getLatestPublishedPosts(supabase, HILO_PREVIEW_COUNT),
      ])
    : [[], 0, [], []];
  const nivel = levelFromPoints(points);

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="lg">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl tracking-tight text-text sm:text-4xl">
                Comunidad
              </h1>
              <p className="mt-2 max-w-xl text-base text-text-muted">
                Challenges, outfits de otros usuarios y beneficios de marcas
                aliadas. Estamos construyendo esta sección.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-text shadow-sm">
              {nivel} · {points} pts
            </span>
          </div>

          {/* ── Challenges de uso ─────────────────────────────────────── */}
          <section className="mt-10">
            <SectionTitle>Challenges de uso</SectionTitle>
            {quests.length === 0 ? (
              <div className="mt-4 rounded-xl bg-surface p-5 shadow-sm">
                <p className="text-sm text-text-muted">
                  No hay challenges activos ahora mismo — volvé pronto.
                </p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {quests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            )}
          </section>

          {/* ── Outfits de la comunidad ───────────────────────────────── */}
          <section className="mt-10">
            <SectionTitle>Outfits de la comunidad</SectionTitle>
            {feed.length === 0 ? (
              <div className="mt-4 rounded-xl bg-surface p-5 shadow-sm">
                <p className="text-sm text-text-muted">
                  Todavía nadie compartió un look. Marca &ldquo;Lo usé
                  hoy&rdquo; en un outfit guardado y sé la primera persona en
                  compartirlo con la comunidad.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {feed.map((share) => (
                  <CommunityShareCard key={share.id} share={share} />
                ))}
              </div>
            )}
          </section>

          {/* ── El Hilo ────────────────────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <SectionTitle>El Hilo</SectionTitle>
                <p className="mt-1 text-sm text-text-muted">
                  No pierdas el hilo de lo que pasa en el mundo de la moda.
                </p>
              </div>
              {hiloPosts.length > 0 ? (
                <Link
                  href="/hilo"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver todo El Hilo
                </Link>
              ) : null}
            </div>

            {hiloPosts.length === 0 ? (
              <div className="mt-4 rounded-xl bg-surface p-5 shadow-sm">
                <p className="text-sm text-text-muted">
                  Pronto empezamos a tejer El Hilo — columnas, drops de marcas
                  aliadas y tendencias, curadas por el equipo de StrandIA.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {hiloPosts.map((post) => (
                  <EditorialPostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>
        </Container>
      </main>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl text-text">{children}</h2>;
}
