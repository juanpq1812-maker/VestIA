// Card AGENDA del dashboard: los eventos de hoy del calendario conectado,
// con hora local y la ocasión inferida. Server Component (los eventos ya
// vienen cacheados de la DB).
//
// Con calendario conectado pero sin eventos hoy, muestra un estado vacío con
// el clima actual — confirmación visible de que el calendario está activo
// (sin esto, conectar el calendario un día sin eventos parece que "no hizo
// nada").

import { clasificarOcasion } from "@/lib/ai/eventOutfit";
import type { CurrentWeather } from "@/lib/weather/openMeteo";

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

export default function AgendaCard({
  events,
  weather,
}: {
  events: AgendaEvent[];
  /** Clima actual — se muestra en el estado vacío (sin eventos hoy). */
  weather?: CurrentWeather | null;
}) {
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
        <h2 className="font-display text-base text-text">Agenda de hoy</h2>
      </div>

      {events.length === 0 ? (
        <div className="mt-4">
          <p className="text-sm text-text-muted">
            Sin eventos en tu calendario hoy. Cuando agendes uno, la IA te
            preparará el look.
          </p>
          {weather ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-surface-2 px-4 py-3">
              <svg
                aria-hidden="true"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-primary"
              >
                {weather.tempC <= 14 ? (
                  // Copo de nieve — clima frío, día de abrigo.
                  <path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11M6 4l1.5 3-3 1M18 4l-1.5 3 3 1M6 20l1.5-3-3-1M18 20l-1.5-3 3-1" />
                ) : weather.tempC >= 24 ? (
                  // Sol — clima cálido, telas frescas.
                  <>
                    <circle cx="12" cy="12" r="4.5" />
                    <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
                  </>
                ) : (
                  // Sol entre nubes — clima templado.
                  <>
                    <path d="M7.5 9a4 4 0 1 1 7.9-1" />
                    <path d="M6 18h11a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8 10.5" />
                  </>
                )}
              </svg>
              <p className="text-sm text-text">
                <span className="font-display text-lg text-text">{weather.tempC}°C</span>{" "}
                y {weather.descripcion.toLowerCase()} en Bogotá, con viento de{" "}
                {weather.windKmh} km/h.{" "}
                <span className="text-text-muted">
                  {weather.tempC <= 14
                    ? "Día para capas y abrigo."
                    : weather.tempC >= 24
                      ? "Día para telas frescas."
                      : "Clima templado, juega libre."}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      ) : (
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
      )}
    </section>
  );
}
