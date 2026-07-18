// /hilo — índice de "El Hilo": todos los posts editoriales publicados,
// del más reciente al más antiguo, con filtro por categoría.

import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import EditorialPostCard from "@/components/editorial/EditorialPostCard";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getAllPublishedPosts } from "@/lib/editorial/query";
import { EDITORIAL_CATEGORY_LABEL, type EditorialCategory } from "@/lib/editorial/types";
import HiloCategoryFilter from "@/components/editorial/HiloCategoryFilter";

export const metadata = {
  title: "El Hilo — StrandIA",
};

const CATEGORIES = Object.keys(EDITORIAL_CATEGORY_LABEL) as EditorialCategory[];

type Props = {
  searchParams: Promise<{ categoria?: string }>;
};

export default async function HiloPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const sp = await searchParams;
  const activeCategory = CATEGORIES.includes(sp.categoria as EditorialCategory)
    ? (sp.categoria as EditorialCategory)
    : null;

  const posts = await getAllPublishedPosts(supabase, activeCategory ?? undefined);

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="lg">
          <h1 className="font-display text-3xl tracking-tight text-text sm:text-4xl">
            El Hilo
          </h1>
          <p className="mt-2 max-w-xl text-base text-text-muted">
            No pierdas el hilo de lo que pasa en el mundo de la moda.
          </p>

          <div className="mt-6">
            <HiloCategoryFilter categories={CATEGORIES} active={activeCategory} />
          </div>

          {posts.length === 0 ? (
            <div className="mt-6 rounded-xl bg-surface p-5 shadow-sm">
              <p className="text-sm text-text-muted">
                {activeCategory
                  ? "Todavía no hay posts en esta categoría."
                  : "Pronto empezamos a tejer El Hilo — columnas, drops de marcas aliadas y tendencias, curadas por el equipo de StrandIA."}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <EditorialPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
