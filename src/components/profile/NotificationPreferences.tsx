// Sección de /profile con los 3 toggles de notificaciones push
// (push_preferences, migración 0027). Guardado optimista: el switch cambia
// al toque y se guarda en segundo plano — si falla, vuelve atrás y avisa.
//
// Sin componente Toggle reusable en el proyecto todavía — se construye acá
// mismo, uno solo, en vez de crear una pieza de UI nueva para un solo lugar.

"use client";

import { useState, useTransition } from "react";
import { savePushPreferencesAction } from "@/app/profile/actions";
import type { PushPreferences } from "@/lib/push/preferences";
import Toast from "@/components/ui/Toast";

type PrefKey = keyof PushPreferences;

const ITEMS: { key: PrefKey; label: string; hint: string }[] = [
  {
    key: "recordatorio_diario",
    label: "Recordatorio diario de outfit",
    hint: "Un aviso en la mañana si todavía no generas tu outfit del día.",
  },
  {
    key: "avisos_hebri",
    label: "Avisos de Hebri",
    hint: "Un mensaje ocasional si Hebri lleva días sin verte.",
  },
  {
    key: "novedades_hilo",
    label: "Novedades de El Hilo",
    hint: "Te avisamos cuando publicamos una columna, drop o tendencia nueva.",
  },
];

export default function NotificationPreferences({
  initial,
}: {
  initial: PushPreferences;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" } | null>(null);

  function onToggle(key: PrefKey) {
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);

    startTransition(async () => {
      const res = await savePushPreferencesAction(next);
      if (!res.ok) {
        setPrefs(previous);
        setToast({ msg: res.error, kind: "error" });
      }
    });
  }

  return (
    <section id="notificaciones" className="mt-10">
      <h2 className="font-display text-2xl text-text">Notificaciones</h2>
      <p className="mt-1 text-sm text-text-muted">
        Elige qué avisos quieres recibir. Puedes apagar solo lo que no te sirva.
      </p>

      <ul className="mt-4 divide-y divide-divider overflow-hidden rounded-xl bg-surface shadow-sm">
        {ITEMS.map((item) => {
          const checked = prefs[item.key];
          return (
            <li key={item.key} className="flex items-center justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">{item.label}</p>
                <p className="mt-0.5 text-xs text-text-muted">{item.hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={item.label}
                disabled={isPending}
                onClick={() => onToggle(item.key)}
                className={[
                  "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-out",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  checked ? "bg-primary" : "bg-surface-2",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                    checked ? "translate-x-[22px]" : "translate-x-0.5",
                  ].join(" ")}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {toast && (
        <Toast message={toast.msg} kind={toast.kind} onDismiss={() => setToast(null)} />
      )}
    </section>
  );
}
