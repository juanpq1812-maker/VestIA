// Clima actual vía Open-Meteo (gratis, sin API key). Server-only.
//
// Coordenadas fijas de Bogotá: el piloto es Colombia (misma decisión que la
// timezone del dashboard). Si la app se expande, esto debería salir de la
// geolocalización o del perfil del usuario.
//
// El fetch usa el caché de Next (revalidate 30 min): todas las visitas de la
// media hora comparten una sola llamada.

const BOGOTA = { lat: 4.711, lon: -74.0721 } as const;

export type CurrentWeather = {
  tempC: number;
  windKmh: number;
  descripcion: string;
};

// Códigos WMO → descripción corta en español.
function describirWmo(code: number): string {
  if (code === 0) return "Despejado";
  if (code <= 2) return "Mayormente despejado";
  if (code === 3) return "Nublado";
  if (code === 45 || code === 48) return "Niebla";
  if (code >= 51 && code <= 57) return "Llovizna";
  if (code >= 61 && code <= 67) return "Lluvia";
  if (code >= 71 && code <= 77) return "Nieve";
  if (code >= 80 && code <= 82) return "Aguaceros";
  if (code >= 95) return "Tormenta";
  return "Variable";
}

/** Clima actual en Bogotá, o null si Open-Meteo no responde (nunca lanza). */
export async function getCurrentWeather(): Promise<CurrentWeather | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${BOGOTA.lat}&longitude=${BOGOTA.lon}` +
      `&current=temperature_2m,wind_speed_10m,weather_code&timezone=America%2FBogota`;
    const res = await fetch(url, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current?: { temperature_2m?: number; wind_speed_10m?: number; weather_code?: number };
    };
    const c = json.current;
    if (!c || typeof c.temperature_2m !== "number") return null;
    return {
      tempC: Math.round(c.temperature_2m),
      windKmh: Math.round(c.wind_speed_10m ?? 0),
      descripcion: describirWmo(c.weather_code ?? -1),
    };
  } catch {
    return null;
  }
}
