// Sección "Calendario" de /profile: conectar un calendario por URL ICS
// (Google o Apple), ver el estado del sync y desconectar.

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

type FeedInfo = {
  provider: string | null;
  maskedUrl: string;
  lastSyncedAt: string | null;
  syncError: string | null;
} | null;

type Props = {
  feed: FeedInfo;
};

export default function CalendarFeedForm({ feed: initialFeed }: Props) {
  const [feed, setFeed] = useState<FeedInfo>(initialFeed);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    setFeed({
      provider: res.provider,
      maskedUrl: maskUrl(trimmed),
      lastSyncedAt: new Date().toISOString(),
      syncError: null,
    });
    setUrl("");
    setOkMsg(
      res.eventCount > 0
        ? `Conectado — encontramos ${res.eventCount} evento${res.eventCount === 1 ? "" : "s"} en los próximos días.`
        : "Conectado — no hay eventos en los próximos 7 días."
    );
  }

  async function onDisconnect() {
    setDeleting(true);
    setError(null);
    setOkMsg(null);
    const res = await deleteCalendarFeedAction();
    setDeleting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setFeed(null);
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-text">Calendario</h2>
      <p className="mt-1 text-sm text-text-muted">
        Conecta tu calendario y la IA te sugerirá un outfit para tus eventos
        del día.
      </p>

      <div className="mt-4 rounded-xl bg-surface p-5 shadow-sm">
        {feed ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">
                  {PROVIDER_LABELS[feed.provider ?? "otro"] ?? "Calendario"} conectado
                </p>
                <p className="mt-0.5 truncate text-xs text-text-faint" title="URL enmascarada">
                  {feed.maskedUrl}
                </p>
              </div>
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-light text-success"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </span>
            </div>

            {feed.syncError ? (
              <p role="alert" className="rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
                Último sync falló: {feed.syncError}
              </p>
            ) : null}
            {okMsg ? (
              <p role="status" className="rounded-md bg-success-light px-3 py-2 text-sm font-medium text-success">
                {okMsg}
              </p>
            ) : null}

            <Button
              variant="ghost"
              onClick={onDisconnect}
              isLoading={deleting}
              loadingText="Desconectando…"
            >
              Desconectar calendario
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Input
              label="URL de tu calendario (iCal)"
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
                  La URL es secreta: solo tú puedes verla y puedes revocarla en
                  cualquier momento desde tu proveedor.
                </p>
              </div>
            </details>

            <Button
              onClick={onConnect}
              isLoading={saving}
              loadingText="Verificando calendario…"
            >
              Conectar calendario
            </Button>
          </div>
        )}
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
