// "La IA vistió tu agenda": sugerencia de outfit para el próximo evento de
// hoy. Client Component — implementa "al abrir + caché del día":
//   - Si la sugerencia ya está cacheada llega por props (server-rendered,
//     0 costo de IA).
//   - Si no, al montar dispara generateEventOutfitAction (una vez) mostrando
//     un estado de carga con mensajes; el resultado queda cacheado en DB para
//     las próximas visitas.

"use client";

import { useEffect, useRef, useState } from "react";
import LazyImage from "@/components/ui/LazyImage";
import { generateEventOutfitAction } from "@/app/outfits/actions";
import { GARMENT_PLACEHOLDER_COLOR } from "@/lib/ui/colors";

export type EventOutfitItem = {
  id: string;
  nombre: string;
  image_url: string | null;
  primary_color: string | null;
};

export type EventOutfitData = {
  name: string;
  explanation: string;
  matchPercentage: number | null;
  occasion: string;
  items: EventOutfitItem[];
};

type Props = {
  eventId: string;
  eventTitle: string;
  /** Hora local ya formateada ("21:00") — la calcula el servidor. */
  eventTime: string;
  /** Sugerencia cacheada (server-rendered) o null para generar al montar. */
  cached: EventOutfitData | null;
};

const MENSAJES = [
  "Leyendo tu agenda…",
  "Eligiendo prendas para tu evento…",
  "Ajustando el look…",
] as const;

export default function EventOutfitSection({
  eventId,
  eventTitle,
  eventTime,
  cached,
}: Props) {
  const [data, setData] = useState<EventOutfitData | null>(cached);
  const [error, setError] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const requested = useRef(false);

  // Generación al abrir (solo si no hay caché). El ref evita el doble disparo
  // de StrictMode en dev.
  useEffect(() => {
    if (data || requested.current) return;
    requested.current = true;
    let cancel = false;
    (async () => {
      const res = await generateEventOutfitAction(eventId);
      if (cancel) return;
      if (res.ok) setData(res.suggestion);
      else setError(res.error);
    })();
    return () => {
      cancel = true;
    };
  }, [data, eventId]);

  // Rotación de mensajes mientras genera.
  useEffect(() => {
    if (data || error) return;
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % MENSAJES.length), 3000);
    return () => clearInterval(t);
  }, [data, error]);

  return (
    <section aria-label="Outfit para tu próximo evento" className="flex flex-col gap-4">
      {/* Banner IA sobre tinta — el "Strandia IA: hoy tienes…" del concepto */}
      <div className="flex items-start gap-3 rounded-xl bg-ink px-5 py-4 text-white">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 shrink-0 text-primary-mid">
          <path d="M12 2c0 4.42-3.58 8-8 8 4.42 0 8 3.58 8 8 0-4.42 3.58-8 8-8-4.42 0-8-3.58-8-8Zm7 12c0 1.66-1.34 3-3 3 1.66 0 3 1.34 3 3 0-1.66 1.34-3 3-3-1.66 0-3-1.34-3-3Z" />
        </svg>
        <p className="text-sm leading-relaxed">
          <strong className="font-semibold">StrandIA:</strong>{" "}
          {data ? (
            <>Hoy tienes {eventTitle} a las {eventTime}. {data.explanation}</>
          ) : error ? (
            <>Hoy tienes {eventTitle} a las {eventTime}.</>
          ) : (
            <span className="text-white/85">{MENSAJES[msgIdx]}</span>
          )}
        </p>
      </div>

      {/* Cuerpo: look sugerido / cargando / error */}
      {data ? (
        <div className="rounded-xl bg-surface p-5 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                Sugerencia IA · {data.occasion}
              </p>
              <h3 className="mt-1 font-display text-xl text-text">{data.name}</h3>
            </div>
            {data.matchPercentage !== null && (
              <span className="shrink-0 rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary">
                {data.matchPercentage}% para tu evento
              </span>
            )}
          </div>

          <ul className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {data.items.map((it) => (
              <li key={it.id} className="w-20 shrink-0">
                <div
                  className="aspect-[3/4] w-full overflow-hidden rounded-lg"
                  style={{ backgroundColor: it.primary_color ?? GARMENT_PLACEHOLDER_COLOR }}
                >
                  {it.image_url ? (
                    <LazyImage
                      src={it.image_url}
                      alt={it.nombre}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <p className="mt-1.5 truncate text-center text-[11px] text-text-muted" title={it.nombre}>
                  {it.nombre}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : error ? (
        <p role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      ) : (
        <div className="rounded-xl bg-surface p-5 shadow-sm" aria-busy="true">
          <div className="h-4 w-40 animate-pulse rounded bg-surface-2" />
          <div className="mt-2 h-6 w-56 animate-pulse rounded bg-surface-2" />
          <div className="mt-4 flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-[3/4] w-20 animate-pulse rounded-lg bg-surface-2" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
