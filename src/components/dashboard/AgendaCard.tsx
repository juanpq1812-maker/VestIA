// Agenda del día en el home: los eventos de hoy del calendario conectado, con
// hora local y la ocasión inferida. Server Component (los eventos ya vienen
// cacheados de la DB).
//
// Sin caja: filetes de 1px y un título en Caslon, como el resto del home. La
// única superficie con relleno de la pantalla es el hero.
//
// El clima vivía acá, dentro del estado vacío. Se movió a DashboardHeadline,
// que lo muestra siempre: tenerlo en los dos lados imprimía la temperatura dos
// veces en la misma pantalla.

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
  return (
    <section aria-label="Agenda de hoy" className="flex flex-col gap-5">
      <h2 className="font-display text-xl leading-tight tracking-tight text-text sm:text-2xl">
        Agenda de hoy
      </h2>

      {events.length === 0 ? (
        <p className="max-w-[52ch] text-sm leading-relaxed text-text-muted">
          Sin eventos en tu calendario hoy. Cuando agendes uno, la IA te
          preparará el look.
        </p>
      ) : (
        <ul className="divide-y divide-divider border-t border-divider">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-baseline gap-5 py-4">
              <span className="min-w-12 shrink-0 text-sm font-medium tabular-nums text-text">
                {ev.all_day ? "Hoy" : horaBogota(ev.starts_at)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm text-text" title={ev.title}>
                  {ev.title}
                </p>
                <p className="mt-0.5 text-xs text-text-faint">
                  {clasificarOcasion(ev.title)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
