// Cabecera editorial del home: fecha + clima, saludo grande, racha.
//
// Server Component: recibe todo pre-calculado desde page.tsx.
//
// El saludo carga la jerarquía de la pantalla — es lo único en Caslon a este
// tamaño, y lo que separa el home de "un dashboard". La fecha y el clima van
// como una línea de metadatos arriba, no como chips con borde: el marco lo
// pone el aire, no las cajas.

import type { CurrentWeather } from "@/lib/weather/openMeteo";
import type { StreakState } from "@/lib/pet/streak";

type Props = {
  displayName: string;
  weather: CurrentWeather | null;
  streak: StreakState;
};

/** Consejo de vestuario a partir de la temperatura. Mismos cortes que AgendaCard. */
function consejoDeClima(tempC: number): string {
  if (tempC <= 14) return "día de capas";
  if (tempC >= 24) return "día de telas frescas";
  return "clima templado";
}

function fechaHoyEspanol(): string {
  // Vercel corre en UTC: sin `timeZone` explícita, un usuario en Colombia
  // vería la fecha de "mañana" desde las 7 pm.
  const fecha = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota",
  });
  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

function textoDeRacha(current: number): string {
  if (current === 1) return "Primer día de tu racha";
  return `${current} días seguidos`;
}

export default function DashboardHeadline({
  displayName,
  weather,
  streak,
}: Props) {
  return (
    <header className="flex flex-col gap-5">
      {/* Sin separador entre fecha y clima: en pantallas angostas el bloque
          envuelve, y un "·" al final de la primera línea se lee como error.
          El espacio ya separa lo suficiente. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-text-muted">
        <span>{fechaHoyEspanol()}</span>
        {weather && (
          <span className="inline-flex items-center gap-1.5">
            <IconoDeClima tempC={weather.tempC} />
            {weather.tempC}°C, {consejoDeClima(weather.tempC)}
          </span>
        )}
      </div>

      <h1 className="font-display text-[clamp(2.75rem,10vw,4.5rem)] leading-[0.92] tracking-tight text-text">
        Hola, {displayName}
      </h1>

      <p className="flex items-center gap-2.5 text-sm text-text-muted">
        <span className="flex gap-1" aria-hidden="true">
          {streak.days.map((d) => (
            <span
              key={d.day}
              className={`h-1.5 w-1.5 rounded-full ${
                d.active ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </span>
        {textoDeRacha(streak.current)}
      </p>
    </header>
  );
}

// ── Ícono de clima ───────────────────────────────────────────────────────────
// Tres estados, alineados con los cortes de `consejoDeClima`.

function IconoDeClima({ tempC }: { tempC: number }) {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {tempC <= 14 ? (
        // Copo de nieve — día de abrigo.
        <path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11M6 4l1.5 3-3 1M18 4l-1.5 3 3 1M6 20l1.5-3-3-1M18 20l-1.5-3 3-1" />
      ) : tempC >= 24 ? (
        // Sol — telas frescas.
        <>
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
        </>
      ) : (
        // Sol entre nubes — templado.
        <>
          <path d="M7.5 9a4 4 0 1 1 7.9-1" />
          <path d="M6 18h11a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8 10.5" />
        </>
      )}
    </svg>
  );
}
