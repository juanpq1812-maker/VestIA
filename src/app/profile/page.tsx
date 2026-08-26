// /profile — perfil del usuario (Design STRANDIA — strandia_perfil).
//
// Server Component: avatar + nombre, stats reales (prendas, outfits, días de
// uso), card "Mi plan" con CTA a /pricing y configuración (placeholders
// marcados "Próximamente" — sin rutas muertas). El logout vive aquí.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import LogoutButton from "@/components/auth/LogoutButton";
import CalendarFeedForm from "@/components/profile/CalendarFeedForm";
import PushDevTools from "@/components/profile/PushDevTools";
import NotificationPreferences from "@/components/profile/NotificationPreferences";
import { DEFAULT_PUSH_PREFERENCES, type PushPreferences } from "@/lib/push/preferences";
import { CONFIRMED_STATUS } from "@/lib/wardrobe/constants";
import { getUserPlan } from "@/lib/plans/getUserPlan";

export const metadata = {
  title: "Perfil — StrandIA",
};

const PLAN_FREE_FEATURES = [
  "Outfits con IA desde tu armario",
  "Recomendación de outfit del día",
  "Armario digital ilimitado",
];

const PLAN_PREMIUM_FEATURES = [
  "Outfits con IA sin cuota mensual",
  "Mejoras de foto ilimitadas",
  "Armario digital ilimitado",
];

// Los ítems con `href` son rutas reales; los demás quedan como "Próximamente".
const CONFIG_ITEMS = [
  { label: "Notificaciones", icon: IconBell, href: "#notificaciones" },
  { label: "Estilo preferido", icon: IconShirt, href: "/profile/style" },
  { label: "Privacidad", icon: IconLock, href: "/profile/privacy" },
  { label: "Cuentas bloqueadas", icon: IconBlock, href: "/profile/blocked" },
  { label: "Ayuda y soporte", icon: IconHelp, href: "/profile/help" },
];

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, itemsRes, outfitsRes, usesRes, feedRes, pushPrefsRes, planInfo] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, created_at")
        .eq("id", user?.id ?? "")
        .maybeSingle(),
      supabase
        .from("clothing_items")
        .select("id", { count: "exact", head: true })
        .eq("status", CONFIRMED_STATUS),
      supabase.from("outfits").select("id", { count: "exact", head: true }),
      supabase.from("outfit_uses").select("used_date"),
      supabase
        .from("calendar_feeds")
        .select("id, url, provider, sync_error")
        .order("created_at", { ascending: true }),
      supabase
        .from("push_preferences")
        .select("recordatorio_diario, avisos_hebri, novedades_hilo")
        .eq("user_id", user?.id ?? "")
        .maybeSingle(),
      getUserPlan(user?.id ?? "", supabase),
    ]);

  // Sin fila = todo activado (ver src/lib/push/preferences.ts).
  const pushPrefs: PushPreferences = pushPrefsRes.data ?? DEFAULT_PUSH_PREFERENCES;

  // Las URLs ICS son secretas: al cliente solo van enmascaradas.
  const feeds = (feedRes.data ?? []).map((f) => ({
    id: f.id,
    provider: f.provider,
    maskedUrl: maskFeedUrl(f.url),
    syncError: f.sync_error,
  }));

  const displayName =
    profileRes.data?.display_name?.trim() || user?.email?.split("@")[0] || "Tu perfil";
  const prendas = itemsRes.count ?? 0;
  const outfits = outfitsRes.count ?? 0;
  const diasDeUso = new Set((usesRes.data ?? []).map((u) => u.used_date)).size;
  const inicial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="md">
          {/* ── Identidad ─────────────────────────────────────────────── */}
          <section className="flex flex-col items-center text-center">
            <div
              aria-hidden="true"
              className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary-mid bg-primary-light font-display text-4xl text-primary"
            >
              {inicial}
            </div>
            <h1 className="mt-4 font-display text-3xl tracking-tight text-text">
              {displayName}
            </h1>
            {user?.email ? (
              <p className="mt-1 text-sm text-text-muted">{user.email}</p>
            ) : null}
          </section>

          {/* ── Stats ─────────────────────────────────────────────────── */}
          <section
            aria-label="Tus estadísticas"
            className="mt-8 grid grid-cols-3 divide-x divide-divider border-y border-divider py-5"
          >
            <Stat valor={prendas} etiqueta={prendas === 1 ? "Prenda" : "Prendas"} />
            <Stat valor={outfits} etiqueta={outfits === 1 ? "Outfit" : "Outfits"} />
            <Stat valor={diasDeUso} etiqueta={diasDeUso === 1 ? "Día de uso" : "Días de uso"} />
          </section>

          {/* ── Mi plan ───────────────────────────────────────────────── */}
          <section className="mt-10">
            <h2 className="font-display text-2xl text-text">Mi plan</h2>
            <div className="mt-4 rounded-xl bg-surface-2 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {planInfo.isPremium ? "StrandIA Premium" : "StrandIA Free"}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    {planInfo.isPremium
                      ? `Activo hasta el ${formatFechaBogota(planInfo.premiumUntil)}`
                      : "Disfruta de lo básico de StrandIA"}
                  </p>
                </div>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-text-muted">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m12 7 1.55 3.13 3.45.5-2.5 2.44.6 3.43L12 14.9l-3.1 1.6.6-3.43L7 10.63l3.45-.5L12 7Z" fill="currentColor" stroke="none" />
                </svg>
              </div>

              <ul className="mt-4 space-y-2.5">
                {(planInfo.isPremium ? PLAN_PREMIUM_FEATURES : PLAN_FREE_FEATURES).map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-text">
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary">
                      <circle cx="12" cy="12" r="9" />
                      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {!planInfo.isPremium && (
                <Link
                  href="/pricing"
                  className="mt-5 flex w-full items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-md active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Upgrade a Premium
                </Link>
              )}
            </div>
          </section>

          {/* ── Calendario ────────────────────────────────────────────── */}
          <CalendarFeedForm feeds={feeds} />

          {/* ── Configuración ─────────────────────────────────────────── */}
          <section className="mt-10">
            <h2 className="font-display text-2xl text-text">Configuración</h2>
            <ul className="mt-4 divide-y divide-divider overflow-hidden rounded-xl bg-surface shadow-sm">
              {CONFIG_ITEMS.map(({ label, icon: Icon, href }) => (
                <li key={label}>
                  {href ? (
                    <Link
                      href={href}
                      className="flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="flex items-center gap-3 text-sm font-medium text-text">
                        <Icon />
                        {label}
                      </span>
                      <svg
                        aria-hidden="true"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 text-text-muted"
                      >
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-3 px-4 py-4">
                      <span className="flex items-center gap-3 text-sm font-medium text-text-muted">
                        <Icon />
                        {label}
                      </span>
                      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        Próximamente
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <NotificationPreferences initial={pushPrefs} />

          <PushDevTools />

          {/* ── Cerrar sesión ─────────────────────────────────────────── */}
          <div className="mt-10 flex justify-center">
            <LogoutButton />
          </div>
        </Container>
      </main>
    </div>
  );
}

// Fecha legible en hora de Colombia para "Activo hasta el...". `null` no
// debería llegar aquí (isPremium ya lo descarta salvo el caso "premium sin
// vencimiento"), pero se cubre igual con un texto neutro.
function formatFechaBogota(iso: string | null): string {
  if (!iso) return "sin fecha de vencimiento";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}

function maskFeedUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const tail = u.pathname.split("/").pop() ?? "";
    return `${u.hostname}/…/${tail}`;
  } catch {
    return "•••";
  }
}

function Stat({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 text-center">
      <span className="font-display text-3xl text-text tabular-nums">{valor}</span>
      <span className="text-xs text-text-muted">{etiqueta}</span>
    </div>
  );
}

// ── Íconos de configuración ──────────────────────────────────────────────────

function IconBell() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </svg>
  );
}

function IconShirt() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.4 6.4 16 4l-1.5 2h-5L8 4 3.6 6.4a1 1 0 0 0-.4 1.3l1.6 3a1 1 0 0 0 1.3.4L7 10.4V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-8.6l.9.7a1 1 0 0 0 1.3-.4l1.6-3a1 1 0 0 0-.4-1.3Z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function IconBlock() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.9.7c0 1.6-2.4 2.3-2.4 3.3" />
      <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
