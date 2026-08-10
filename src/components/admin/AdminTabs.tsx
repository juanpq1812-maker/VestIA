// Tabs de secciones dentro de /admin — mismo patrón que WardrobeTabs.
// "Reportes" vive DENTRO de la sección de admin, no en el nav principal:
// solo hay un ítem "Admin" en Header/BottomNav, y acá adentro se navega
// entre Fashion Quests y Reportes.

import Link from "next/link";

type Props = {
  active: "quests" | "hilo" | "reports" | "users";
};

const TABS = [
  { key: "quests", label: "Fashion Quests", href: "/admin/quests" },
  { key: "hilo", label: "El Hilo", href: "/admin/hilo" },
  { key: "reports", label: "Reportes", href: "/admin/reports" },
  { key: "users", label: "Usuarios", href: "/admin/users" },
] as const;

export default function AdminTabs({ active }: Props) {
  return (
    <nav aria-label="Secciones de administración" className="overflow-x-auto border-b border-divider">
      <ul className="flex min-w-max">
        {TABS.map((tab) => {
          const activo = tab.key === active;
          return (
            <li key={tab.key} className="flex-1">
              <Link
                href={tab.href}
                aria-current={activo ? "page" : undefined}
                className={[
                  "-mb-px flex items-center justify-center whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors duration-150",
                  activo
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:border-border hover:text-text",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
