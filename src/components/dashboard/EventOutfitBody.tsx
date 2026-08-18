// Cuerpo del hero cuando hay un evento próximo: "la IA vistió tu agenda".
//
// Antes era EventOutfitSection y traía su propio marco (banner de tinta +
// card blanca). Ahora vive DENTRO del hero de lino de TodayHero, así que
// aporta solo contenido: la caja la pone el padre. La lógica no cambió.
//
// Implementa "al abrir + caché":
//   - Si la sugerencia ya está cacheada llega por props (server-rendered,
//     0 costo de IA).
//   - Si no, al montar dispara generateEventOutfitAction (una vez) mostrando
//     un estado de carga con mensajes; el resultado queda cacheado en DB
//     (event_outfit_suggestions, unique por event_id) para las próximas
//     visitas.
//
// Esta ruta NO consume la cuota mensual del plan free: pasa solo por el rate
// limit horario. Ver la nota de decisión en lib/outfits/lookDelDia.ts.

"use client";

import { useEffect, useRef, useState } from "react";
import OutfitMoodboard, {
  type MoodboardItem,
} from "@/components/outfits/OutfitMoodboard";
import { generateEventOutfitAction } from "@/app/outfits/actions";

/**
 * Las prendas llegan ya en la forma que consume el moodboard. `category` no es
 * decorativa: OutfitMoodboard ubica cada prenda en su zona según ella, y sin
 * categoría todas se apilarían en la misma esquina.
 */
export type EventOutfitItem = MoodboardItem;

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
  /** Hora local ya formateada ("20:00") — la calcula el servidor. */
  eventTime: string;
  /** Sugerencia cacheada (server-rendered) o null para generar al montar. */
  cached: EventOutfitData | null;
};

const MENSAJES = [
  "Leyendo tu agenda…",
  "Eligiendo prendas para tu evento…",
  "Ajustando el look…",
] as const;

export default function EventOutfitBody({
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
    <div className="sm:mx-auto sm:flex sm:max-w-3xl sm:items-center sm:gap-10">
      <div className="sm:w-1/2 sm:shrink-0">
        {data ? (
          <OutfitMoodboard items={data.items} />
        ) : (
          <div
            className="aspect-square w-full animate-pulse rounded-2xl bg-primary-light sm:aspect-[4/5]"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="mt-6 flex flex-col gap-5 sm:mt-0 sm:w-1/2">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            La IA vistió tu agenda
          </p>
          <h2 className="font-display text-3xl leading-[1.1] tracking-tight text-text sm:text-4xl">
            {eventTitle}
          </h2>
          <p className="text-sm text-text-muted">
            {[
              `Hoy a las ${eventTime}`,
              data?.occasion,
              data?.matchPercentage !== null && data?.matchPercentage !== undefined
                ? `${data.matchPercentage}% para tu evento`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {data ? (
          <p className="max-w-[42ch] text-sm leading-relaxed text-text-muted">
            {data.explanation}
          </p>
        ) : error ? (
          <p
            role="alert"
            className="max-w-[42ch] rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
          >
            {error}
          </p>
        ) : (
          <p className="text-sm text-text-muted" aria-busy="true">
            {MENSAJES[msgIdx]}
          </p>
        )}
      </div>
    </div>
  );
}
