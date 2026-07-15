// Card de un Fashion Quest en /comunidad — progreso real + botón "Reclamar".
// La verificación que de verdad importa ocurre en complete_quest() (RPC);
// acá solo mostramos el estado y disparamos la acción.

"use client";

import { useState, useTransition } from "react";
import { completeQuestAction } from "@/lib/community/actions";
import type { QuestWithProgress } from "@/lib/community/query";

export default function QuestCard({ quest }: { quest: QuestWithProgress }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { kind: "success"; msg: string } | { kind: "error"; msg: string } | null
  >(null);
  const [completed, setCompleted] = useState(quest.completed);
  const [benefitUnlocked, setBenefitUnlocked] = useState(quest.benefitUnlocked);

  // Los quests sin verificación de progreso en el cliente (rescue_forgotten_item)
  // dejan que el botón "Reclamar" siempre esté disponible — el RPC es quien
  // de verdad decide si corresponde.
  const canAttemptClaim = quest.quest_type === "rescue_forgotten_item" || quest.progress >= quest.target_count;

  function handleClaim() {
    startTransition(async () => {
      const res = await completeQuestAction(quest.id);
      if (res.ok) {
        setCompleted(true);
        setBenefitUnlocked(res.benefitUnlocked);
        setResult({ kind: "success", msg: `+${res.pointsAwarded} pts` });
      } else {
        setResult({ kind: "error", msg: res.error });
      }
    });
  }

  const progressPct = Math.min(100, Math.round((quest.progress / quest.target_count) * 100));

  return (
    <div className="rounded-xl bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text">{quest.title}</h3>
          <p className="mt-1 text-sm text-text-muted">{quest.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary">
          {quest.points_reward} pts
        </span>
      </div>

      {quest.quest_type !== "rescue_forgotten_item" && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Tu progreso</span>
            <span>
              {Math.min(quest.progress, quest.target_count)}/{quest.target_count}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del quest"
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {quest.brand_name ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13" />
            <path d="M12 8c-1.7 0-3-1-3-2.5A2.5 2.5 0 0 1 11.5 3c1.4 0 2.5 2 2.5 5Zm0 0c1.7 0 3-1 3-2.5A2.5 2.5 0 0 0 12.5 3c-1.4 0-2.5 2-2.5 5Z" />
          </svg>
          {quest.brand_name} — {quest.benefit_description}
        </p>
      ) : null}

      <div className="mt-4">
        {completed ? (
          <p className="text-sm font-semibold text-success">
            Completado
            {benefitUnlocked ? " — beneficio desbloqueado, canje disponible pronto" : ""}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleClaim}
            disabled={!canAttemptClaim || isPending}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:bg-primary-hover hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {isPending ? "Reclamando…" : "Reclamar"}
          </button>
        )}
        {result ? (
          <p
            role="status"
            className={[
              "mt-2 text-xs font-medium",
              result.kind === "success" ? "text-success" : "text-danger",
            ].join(" ")}
          >
            {result.msg}
          </p>
        ) : null}
      </div>
    </div>
  );
}
