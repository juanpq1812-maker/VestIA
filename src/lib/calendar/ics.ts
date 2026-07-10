// Parser de feeds ICS (Google Calendar "dirección secreta en formato iCal",
// calendarios públicos de iCloud, etc.) → eventos normalizados.
//
// SERVER-ONLY: usa node-ical, que resuelve lo difícil de ICS (timezones y
// recurrencias RRULE — la mayoría de reuniones de trabajo son recurrentes).
//
// Ventana de expansión: [ahora - 1 día, ahora + 7 días]. El día extra hacia
// atrás cubre eventos en curso.

import ical, { type VEvent } from "node-ical";

export type ParsedEvent = {
  externalUid: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  location: string | null;
};

const WINDOW_BACK_MS = 1 * 24 * 60 * 60 * 1000;
const WINDOW_FWD_MS = 7 * 24 * 60 * 60 * 1000;

/** Normaliza webcal:// → https:// y valida que sea un destino seguro. */
export function normalizeFeedUrl(raw: string): string {
  let url = raw.trim();
  if (url.startsWith("webcal://")) url = "https://" + url.slice("webcal://".length);

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("La URL no es válida. Copia la dirección iCal completa.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("La URL debe ser https:// o webcal://.");
  }
  // Anti-SSRF básico: nada de hosts locales/privados. Un feed de calendario
  // real siempre es un host público (google.com, icloud.com, etc.).
  const host = parsed.hostname.toLowerCase();
  const esPrivado =
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host === "::1";
  if (esPrivado) {
    throw new Error("Esa URL no parece un calendario público.");
  }
  return parsed.toString();
}

/** Adivina el proveedor a partir del host (solo cosmético para la UI). */
export function guessProvider(url: string): string {
  const host = new URL(url).hostname;
  if (host.includes("google")) return "google";
  if (host.includes("icloud") || host.includes("apple")) return "apple";
  if (host.includes("outlook") || host.includes("office365")) return "outlook";
  return "otro";
}

/**
 * Descarga y parsea el feed, expandiendo recurrencias dentro de la ventana.
 * Lanza Error con mensaje amigable si el feed no responde o no es ICS.
 */
export async function fetchAndParseFeed(url: string): Promise<ParsedEvent[]> {
  const res = await fetch(url, {
    headers: { "user-agent": "StrandIA-Calendar/1.0" },
    signal: AbortSignal.timeout(10_000),
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`El calendario respondió ${res.status}. Verifica que la URL siga vigente.`);
  }
  const text = await res.text();
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new Error("Esa URL no devuelve un calendario iCal (.ics).");
  }
  return parseIcsText(text);
}

/** Parseo puro del texto ICS (separado de la descarga para poder testearlo). */
export function parseIcsText(text: string): ParsedEvent[] {
  const data = ical.sync.parseICS(text);
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_BACK_MS);
  const windowEnd = new Date(now + WINDOW_FWD_MS);

  const eventos: ParsedEvent[] = [];

  for (const key of Object.keys(data)) {
    const item = data[key];
    if (!item || item.type !== "VEVENT") continue;
    const ev = item as VEvent;
    if (!ev.start) continue;

    const durationMs = ev.end
      ? new Date(ev.end).getTime() - new Date(ev.start).getTime()
      : 0;
    const allDay = (ev.datetype ?? "") === "date";
    const title = (ev.summary ?? "").toString().trim() || "(Sin título)";
    const location = ev.location ? String(ev.location).trim() || null : null;
    const uid = String(ev.uid ?? key);

    if (ev.rrule) {
      // Recurrente: expandir las instancias dentro de la ventana.
      const fechas = ev.rrule.between(windowStart, windowEnd, true);
      // Fechas excluidas (EXDATE) — node-ical las expone como mapa.
      const exdates = new Set(
        Object.values(ev.exdate ?? {}).map((d) => new Date(d as unknown as string | Date).toDateString())
      );
      for (const fecha of fechas) {
        if (exdates.has(fecha.toDateString())) continue;
        const start = new Date(fecha);
        eventos.push({
          externalUid: uid,
          title,
          startsAt: start,
          endsAt: durationMs > 0 ? new Date(start.getTime() + durationMs) : null,
          allDay,
          location,
        });
      }
      // Instancias modificadas de la recurrencia (RECURRENCE-ID).
      for (const override of Object.values(ev.recurrences ?? {})) {
        const ov = override as VEvent;
        if (!ov.start) continue;
        const start = new Date(ov.start);
        if (start < windowStart || start > windowEnd) continue;
        eventos.push({
          externalUid: uid,
          title: (ov.summary ?? title).toString().trim() || title,
          startsAt: start,
          endsAt: ov.end ? new Date(ov.end) : null,
          allDay,
          location: ov.location ? String(ov.location).trim() || null : location,
        });
      }
      continue;
    }

    const start = new Date(ev.start);
    if (start < windowStart || start > windowEnd) continue;
    eventos.push({
      externalUid: uid,
      title,
      startsAt: start,
      endsAt: ev.end ? new Date(ev.end) : null,
      allDay,
      location,
    });
  }

  // Dedup por (uid, starts_at): las instancias override pueden duplicar la
  // expansión del RRULE en la misma fecha.
  const vistos = new Set<string>();
  const unicos = eventos.filter((e) => {
    const k = `${e.externalUid}|${e.startsAt.toISOString()}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });

  unicos.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return unicos;
}
