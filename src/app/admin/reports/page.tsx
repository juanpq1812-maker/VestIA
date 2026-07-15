// /admin/reports — panel de administración de reportes de contenido del
// feed de comunidad.
//
// Protegida a nivel de página (no en src/proxy.ts): Server Component que lee
// profiles.is_admin y redirige si no corresponde. Mismo patrón que
// /admin/quests/page.tsx.

import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import AdminTabs from "@/components/admin/AdminTabs";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { createCommunityShareSignedUrlMap } from "@/lib/storage/communityShares";
import { resolveReportAction } from "./actions";

export const metadata = {
  title: "Admin · Reportes — StrandIA",
};

type ReportRow = {
  id: string;
  reason: string | null;
  status: "pending" | "dismissed" | "removed";
  created_at: string;
  reporter_id: string;
  reporter_display_name: string | null;
  share_id: string;
};

export default async function AdminReportsPage() {
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

  const { data: reportsData } = await supabase
    .from("community_share_reports")
    .select("id, reason, status, created_at, reporter_id, reporter_display_name, share_id")
    .order("created_at", { ascending: false });

  const reports = (reportsData ?? []) as ReportRow[];
  const pending = reports.filter((r) => r.status === "pending");
  const resolved = reports.filter((r) => r.status !== "pending");

  const shareIds = Array.from(new Set(reports.map((r) => r.share_id)));

  const { data: sharesData } =
    shareIds.length > 0
      ? await supabase
          .from("community_shares")
          .select("id, author_display_name, photo_path, caption")
          .in("id", shareIds)
      : { data: [] };

  const sharesById = new Map((sharesData ?? []).map((s) => [s.id, s]));

  const photoUrlMap = await createCommunityShareSignedUrlMap(
    supabase,
    (sharesData ?? []).map((s) => s.photo_path)
  );

  function renderReport(r: ReportRow) {
    const share = sharesById.get(r.share_id);
    const photoUrl = share ? photoUrlMap.get(share.photo_path) ?? null : null;
    const reporterName = r.reporter_display_name?.trim() || "Usuario";

    return (
      <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">
              {share?.author_display_name?.trim() || "Autor desconocido"}
            </p>
            {share?.caption && (
              <p className="mt-0.5 truncate text-xs text-text-muted">{share.caption}</p>
            )}
            <p className="mt-1 text-xs text-text-muted">
              Reportado por {reporterName}
              {r.reason ? ` · ${r.reason}` : ""}
            </p>
            <p className="mt-0.5 text-[11px] text-text-faint">
              {new Date(r.created_at).toLocaleDateString("es-CO")}
              {r.status !== "pending" ? ` · ${r.status === "dismissed" ? "Descartado" : "Eliminado"}` : ""}
            </p>
          </div>
        </div>

        {r.status === "pending" && (
          <div className="flex shrink-0 items-center gap-2">
            <form
              action={async () => {
                "use server";
                await resolveReportAction(r.id, "dismiss");
              }}
            >
              <button
                type="submit"
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-text transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Descartar
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                await resolveReportAction(r.id, "remove");
              }}
            >
              <button
                type="submit"
                className="rounded-full bg-danger px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-danger/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Eliminar outfit
              </button>
            </form>
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="lg">
          <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
            Reportes de comunidad
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Contenido reportado por la comunidad — descartá el reporte o
            eliminá el outfit compartido.
          </p>

          <div className="mt-6">
            <AdminTabs active="reports" />
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            {pending.length === 0 ? (
              <p className="p-6 text-sm text-text-muted">No hay reportes pendientes.</p>
            ) : (
              <ul className="divide-y divide-divider">{pending.map(renderReport)}</ul>
            )}
          </div>

          {resolved.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-semibold text-text-muted hover:text-text">
                Historial resuelto ({resolved.length})
              </summary>
              <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                <ul className="divide-y divide-divider">{resolved.map(renderReport)}</ul>
              </div>
            </details>
          )}
        </Container>
      </main>
    </div>
  );
}
