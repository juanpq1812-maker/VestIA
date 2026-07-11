// Chat de soporte de /profile/help. Cliente: mantiene el historial local,
// llama a la Server Action `askSupportAction` y muestra las burbujas.
// Sin streaming — las respuestas son cortas (≤512 tokens) y el patrón de
// spinner + botón deshabilitado cubre el feedback.

"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { askSupportAction } from "@/app/profile/help/actions";

type Turn = { role: "user" | "assistant"; content: string };

const MAX_INPUT_CHARS = 1000;

const SUGERENCIAS = [
  "¿Cómo genero mi primer outfit?",
  "¿Cómo conecto mi calendario?",
  "¿Qué incluye el plan Free?",
];

export default function SupportChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, sending]);

  async function enviar(texto: string) {
    const pregunta = texto.trim().slice(0, MAX_INPUT_CHARS);
    if (!pregunta || sending) return;

    const nuevoHistorial: Turn[] = [...turns, { role: "user", content: pregunta }];
    setTurns(nuevoHistorial);
    setInput("");
    setError(null);
    setSending(true);

    const res = await askSupportAction(nuevoHistorial);
    setSending(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTurns((prev) => [...prev, { role: "assistant", content: res.reply }]);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {/* Header del chat */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.2 0-2.4-.25-3.4-.7L3 21l1.7-5.1A8.5 8.5 0 1 1 21 11.5Z" />
          </svg>
        </span>
        <div>
          <h3 className="font-display text-xl font-semibold text-text">
            Asistente StrandIA
          </h3>
          <p className="text-xs text-text-muted">
            Respuestas con IA sobre cómo usar la app
          </p>
        </div>
      </div>

      {/* Mensajes */}
      <div
        aria-live="polite"
        className="flex max-h-96 min-h-48 flex-col gap-3 overflow-y-auto p-5"
      >
        {turns.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-muted">
              Hola 👋 ¿en qué te ayudo? Puedes preguntarme cómo usar cualquier
              parte de StrandIA.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  disabled={sending}
                  className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-muted transition-all duration-150 hover:border-primary-mid hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((t, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap motion-safe:animate-[fadeInUp_180ms_ease-out] ${
                t.role === "user"
                  ? "self-end bg-primary text-white"
                  : "self-start bg-surface-2 text-text"
              }`}
            >
              {t.content}
            </div>
          ))
        )}

        {sending ? (
          <div className="flex items-center gap-2 self-start rounded-2xl bg-surface-2 px-4 py-2.5">
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
            />
            <span className="text-sm text-text-muted">Pensando…</span>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="self-start rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
          >
            {error}
          </p>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(input);
        }}
        className="flex items-center gap-2 border-t border-border bg-surface-2 px-4 py-3"
      >
        <label htmlFor="support-chat-input" className="sr-only">
          Escribe tu pregunta
        </label>
        <input
          id="support-chat-input"
          type="text"
          value={input}
          maxLength={MAX_INPUT_CHARS}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
          className="w-full rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder:text-text-faint transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
        />
        <Button type="submit" disabled={sending || input.trim().length === 0}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
