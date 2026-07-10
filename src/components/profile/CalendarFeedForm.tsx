// Sección "Calendario" de /profile: conectar calendarios por URL ICS.
// Multi-feed: se pueden tener Google Y Apple conectados a la vez — cada uno
// aparece en la lista con su estado y su botón de desconexión.

"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  saveCalendarFeedAction,
  deleteCalendarFeedAction,
} from "@/app/profile/actions";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google Calendar",
  apple: "Apple Calendar",
  outlook: "Outlook",
  otro: "Calendario",
};

export type FeedInfo = {
  id: string;
  provider: string | null;
  maskedUrl: string;
  syncError: string | null;
};

type Props = {
  feeds: FeedInfo[];
};

export default function CalendarFeedForm({ feeds: initialFeeds }: Props) {
  const [feeds, setFeeds] = useState<FeedInfo[]>(initialFeeds);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function onConnect() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Pega la URL de tu calendario primero.");
      return;
    }
    setSaving(true);
    setError(null);
    setOkMsg(null);
    const res = await saveCalendarFeedAction(trimmed);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setFeeds((prev) => [
      ...prev,
      {
        id: res.feedId,
        provider: res.provider,
        maskedUrl: maskUrl(trimmed),
        syncError: null,
      },
    ]);
    setUrl("");
    setOkMsg(
      res.eventCount > 0
        ? `Conectado — encontramos ${res.eventCount} evento${res.eventCount === 1 ? "" : "s"} en los próximos días.`
        : "Conectado — no hay eventos en los próximos 7 días."
    );
  }

  async function onDisconnect(feedId: string) {
    setDeletingId(feedId);
    setError(null);
    setOkMsg(null);
    const res = await deleteCalendarFeedAction(feedId);
    setDeletingId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setFeeds((prev) => prev.filter((f) => f.id !== feedId));
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-text">Calendario</h2>
      <p className="mt-1 text-sm text-text-muted">
        Conecta tus calendarios (puedes tener Google y Apple a la vez) y la IA
        te sugerirá un outfit para tus eventos del día.
      </p>

      <div className="mt-4 flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-sm">
        {/* Calendarios conectados */}
        {feeds.length > 0 ? (
          <ul className="flex flex-col divide-y divide-divider">
            {feeds.map((feed) => (
              <li key={feed.id} className="flex flex-col gap-2 py-3 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">
                      {PROVIDER_LABELS[feed.provider ?? "otro"] ?? "Calendario"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-faint" title="URL enmascarada">
                      {feed.maskedUrl}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-success-light text-success"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                    <button
                      type="button"
                      onClick={() => onDisconnect(feed.id)}
                      disabled={deletingId !== null}
                      aria-busy={deletingId === feed.id}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-danger-light hover:text-danger disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {deletingId === feed.id ? "Desconectando…" : "Desconectar"}
                    </button>
                  </div>
                </div>
                {feed.syncError ? (
                  <p role="alert" className="rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
                    Último sync falló: {feed.syncError}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {okMsg ? (
          <p role="status" className="rounded-md bg-success-light px-3 py-2 text-sm font-medium text-success">
            {okMsg}
          </p>
        ) : null}

        {/* Agregar otro calendario */}
        <div className="flex flex-col gap-4">
          <Input
            label={feeds.length > 0 ? "Agregar otro calendario (iCal)" : "URL de tu calendario (iCal)"}
            type="url"
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            error={error ?? undefined}
            hint="Funciona con la dirección secreta de Google Calendar o el enlace público de iCloud."
          />

          <details className="rounded-lg bg-surface-2 px-4 py-3 text-sm text-text-muted">
            <summary className="cursor-pointer font-semibold text-text">
              ¿Dónde encuentro esta URL?
            </summary>
            <div className="mt-3 space-y-3">
              <p>
                <strong className="text-text">Google Calendar:</strong>{" "}
                calendar.google.com → ⚙️ Configuración → tu calendario →
                &ldquo;Integrar el calendario&rdquo; → copia la{" "}
                <em>dirección secreta en formato iCal</em>.
              </p>
              <p>
                <strong className="text-text">Apple Calendar (iCloud):</strong>{" "}
                en la app Calendario → toca el calendario → &ldquo;Calendario
                público&rdquo; → activa y copia el enlace (webcal://…).
              </p>
              <p className="text-xs text-text-faint">
                Las URLs son secretas: solo tú puedes verlas y puedes
                revocarlas en cualquier momento desde tu proveedor.
              </p>
            </div>
          </details>

          <Button
            onClick={onConnect}
            isLoading={saving}
            loadingText="Verificando calendario…"
          >
            {feeds.length > 0 ? "Agregar calendario" : "Conectar calendario"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function maskUrl(raw: string): string {
  try {
    const u = new URL(raw.replace(/^webcal:\/\//, "https://"));
    const tail = u.pathname.split("/").pop() ?? "";
    return `${u.hostname}/…/${tail}`;
  } catch {
    return "•••";
  }
}
