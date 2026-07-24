// /admin/hilo — panel de administración de "El Hilo" (editorial_posts).
//
// Protegida a nivel de página (no en src/proxy.ts): Server Component que lee
// profiles.is_admin y redirige si no corresponde — mismo patrón que
// /admin/quests.

import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import AdminTabs from "@/components/admin/AdminTabs";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { EDITORIAL_CATEGORY_LABEL, type EditorialCategory } from "@/lib/editorial/types";
import { formatHumanDate } from "@/lib/outfits/dateUtils";
import EditorialPostRowActions from "@/components/admin/EditorialPostRowActions";

export const metadata = {
  title: "Admin · El Hilo — StrandIA",
};

export default async function AdminHiloPage() {
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

  const { data: posts } = await supabase
    .from("editorial_posts")
    .select("id, title, category, status, brand_name, created_at, published_at, notificado_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="lg">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
              El Hilo
            </h1>
            <Link href="/admin/hilo/new">
              <Button>Crear post</Button>
            </Link>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Contenido editorial curado por el equipo — columnas, drops de
            marcas aliadas y tendencias. Visible en /comunidad y /hilo solo
            cuando está publicado.
          </p>

          <div className="mt-6">
            <AdminTabs active="hilo" />
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            {(posts ?? []).length === 0 ? (
              <p className="p-6 text-sm text-text-muted">
                No hay posts todavía. Creá el primero.
              </p>
            ) : (
              <ul className="divide-y divide-divider">
                {(posts ?? []).map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-text">{p.title}</p>
                        <span
                          className={[
                            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            p.status === "published"
                              ? "bg-success-light text-success"
                              : "bg-surface-2 text-text-muted",
                          ].join(" ")}
                        >
                          {p.status === "published" ? "Publicado" : "Borrador"}
                        </span>
                        <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                          {EDITORIAL_CATEGORY_LABEL[p.category as EditorialCategory]}
                        </span>
                        {p.brand_name ? (
                          <span className="rounded-full bg-surface-offset px-2.5 py-0.5 text-[11px] font-semibold text-text-muted">
                            {p.brand_name}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        Creado {formatHumanDate(p.created_at.slice(0, 10))}
                        {p.published_at
                          ? ` · Publicado ${formatHumanDate(p.published_at.slice(0, 10))}`
                          : ""}
                      </p>
                    </div>
                    <EditorialPostRowActions
                      postId={p.id}
                      status={p.status as "draft" | "published"}
                      notificadoAt={p.notificado_at}
                    />
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
