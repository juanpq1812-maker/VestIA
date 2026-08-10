// /admin/users — asignar/quitar premium a mano (sin Wompi todavía).
//
// Protegida a nivel de página, mismo patrón que /admin/reports y
// /admin/quests: Server Component que lee profiles.is_admin y redirige si
// no corresponde.
//
// `profiles` no guarda email (vive en auth.users) — se resuelve con
// `admin.auth.admin.listUsers()` (service_role) y se cruza por id. Pensado
// para la escala del piloto: una sola página, sin paginación de verdad.

import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AdminTabs from "@/components/admin/AdminTabs";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { isPremiumFrom } from "@/lib/plans/planLogic";
import { grantPremiumAction, revokePremiumAction } from "./actions";

export const metadata = {
  title: "Admin · Usuarios — StrandIA",
};

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
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

  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const [{ data: profiles }, { data: authList }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, plan, premium_until, created_at")
      .order("created_at", { ascending: false }),
    // service_role: profiles no tiene email, solo auth.users lo tiene.
    createSupabaseAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailById = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  // isPremiumFrom() sin tercer argumento resuelve Date.now() en su propio
  // default — así el linter de pureza de React no ve una llamada a un
  // impuro directamente en el cuerpo de este componente.
  const rows = (profiles ?? []).map((p) => {
    const isPremium = isPremiumFrom(p.plan, p.premium_until);
    return {
      ...p,
      email: emailById.get(p.id) ?? "",
      isPremium,
      vencido: p.plan === "premium" && !isPremium,
    };
  });

  const filtered = query
    ? rows.filter(
        (r) =>
          r.email.toLowerCase().includes(query) ||
          (r.display_name ?? "").toLowerCase().includes(query) ||
          r.id.toLowerCase().includes(query)
      )
    : rows;

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="lg">
          <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
            Usuarios
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Da o quita premium a mano — es lo que se usa para el trial de 7
            días del piloto, hasta que llegue el cobro con Wompi.
          </p>

          <div className="mt-6">
            <AdminTabs active="users" />
          </div>

          <form method="get" className="mt-8 max-w-sm">
            <Input
              label="Buscar"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Email, nombre o id"
              hint={`${filtered.length} de ${rows.length} usuarios`}
            />
          </form>

          <ul className="mt-6 divide-y divide-divider overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            {filtered.length === 0 ? (
              <li className="p-6 text-sm text-text-muted">
                No encontramos usuarios con ese criterio.
              </li>
            ) : (
              filtered.map((r) => {
                const { isPremium, vencido } = r;

                return (
                  <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">
                        {r.display_name?.trim() || "Sin nombre"}
                      </p>
                      <p className="truncate text-xs text-text-muted">{r.email || r.id}</p>
                      <p className="mt-1 text-xs">
                        {isPremium ? (
                          <span className="font-semibold text-primary">
                            Premium
                            {r.premium_until
                              ? ` · hasta el ${new Date(r.premium_until).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" })}`
                              : ""}
                          </span>
                        ) : vencido ? (
                          <span className="font-semibold text-text-muted">
                            Premium vencido — se comporta como free
                          </span>
                        ) : (
                          <span className="text-text-muted">Free</span>
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <form
                        action={async (formData: FormData) => {
                          "use server";
                          const days = Number(formData.get("dias"));
                          await grantPremiumAction(r.id, days);
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="number"
                          name="dias"
                          defaultValue={7}
                          min={1}
                          aria-label={`Días de premium para ${r.email || r.id}`}
                          className="w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                        />
                        <Button type="submit" variant="primary" size="md">
                          Dar premium
                        </Button>
                      </form>

                      {r.plan === "premium" && (
                        <form
                          action={async () => {
                            "use server";
                            await revokePremiumAction(r.id);
                          }}
                        >
                          <Button type="submit" variant="ghost" size="md">
                            Quitar
                          </Button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </Container>
      </main>
    </div>
  );
}
