// Hebri: elige la ilustración del estado de ánimo actual, hace crossfade
// cuando el estado cambia (mismo patrón de fade que LazyImage.tsx), y
// superpone el overlay de "sucia" si corresponde.
//
// Assets en /public/hebri/estados/ y /public/hebri/overlay/ (rutas en
// src/lib/pet/constants.ts) — para actualizar el arte alcanza con pisar
// esos archivos, este componente no cambia.

"use client";

import { useEffect, useRef, useState } from "react";
import {
  PET_DIRTY_OVERLAY_ASSET,
  PET_MOOD_ASSET,
  type PetMood,
} from "@/lib/pet/constants";

type Props = {
  mood: PetMood;
  isDirty: boolean;
  size?: number;
  className?: string;
};

const CROSSFADE_MS = 320;

export default function HebriSprite({ mood, isDirty, size = 84, className }: Props) {
  const [current, setCurrent] = useState<PetMood>(mood);
  const [previous, setPrevious] = useState<PetMood | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mood === current) return;
    setPrevious(current);
    setCurrent(mood);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setPrevious(null), CROSSFADE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood]);

  const swayClass =
    current === "hibernando"
      ? "pet-sway-still"
      : current === "triste"
        ? "pet-sway-slow"
        : "";

  return (
    <div
      className={["relative", className ?? ""].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
      aria-label={`Hebri está ${current}${isDirty ? ", un poco despeinada" : ""}`}
      role="img"
    >
      <div className={`pet-sway ${swayClass} h-full w-full motion-reduce:!animate-none`}>
        <div className="pet-breathe h-full w-full motion-reduce:!animate-none">
          <div className="pet-blink h-full w-full motion-reduce:!animate-none">
            {previous ? (
              <img
                src={PET_MOOD_ASSET[previous]}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity"
                style={{ transitionDuration: `${CROSSFADE_MS}ms` }}
              />
            ) : null}
            <img
              key={current}
              src={PET_MOOD_ASSET[current]}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-contain opacity-100 transition-opacity"
              style={{ transitionDuration: `${CROSSFADE_MS}ms` }}
            />
          </div>
        </div>
      </div>

      {isDirty ? (
        <img
          src={PET_DIRTY_OVERLAY_ASSET}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
      ) : null}
    </div>
  );
}
