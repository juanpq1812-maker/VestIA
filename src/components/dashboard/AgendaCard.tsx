// Card AGENDA del dashboard: los eventos de hoy del calendario conectado,
// con hora local y la ocasión inferida. Server Component (los eventos ya
// vienen cacheados de la DB).

import { clasificarOcasion } from "@/lib/ai/eventOutfit";

export type AgendaEvent = {
  id: string;
  title: string;
  starts_at: string;
  all_day: boolean;
};

function horaBogota(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  });
}

export default function AgendaCard({ events }: { events: AgendaEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section
      aria-label="Agenda de hoy"
      className="rounded-xl bg-surface p-5 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
          Agenda de hoy
        </h2>
      </div>

      <ul className="mt-4 divide-y divide-divider">
        {events.map((ev) => (
          <li key={ev.id} className="flex items-baseline gap-4 py-3 first:pt-0 last:pb-0">
            <span className="min-w-12 shrink-0 text-sm font-semibold tabular-nums text-text">
              {ev.all_day ? "Hoy" : horaBogota(ev.starts_at)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text" title={ev.title}>
                {ev.title}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {clasificarOcasion(ev.title)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
