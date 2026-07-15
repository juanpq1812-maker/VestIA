// Formulario crear/editar de /admin/quests. Client Component: maneja estado
// local y llama al server action correspondiente (create o update).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { QUEST_TYPE_LABEL, type QuestType } from "@/lib/community/constants";
import {
  createQuestAction,
  updateQuestAction,
  type QuestInput,
} from "@/app/admin/quests/actions";

const QUEST_TYPES = Object.keys(QUEST_TYPE_LABEL) as QuestType[];

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export type QuestFormInitial = {
  id?: string;
  questType: QuestType;
  title: string;
  description: string;
  targetCount: number;
  windowDays: number;
  pointsReward: number;
  brandName: string;
  benefitDescription: string;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
};

export default function QuestForm({ initial }: { initial: QuestFormInitial }) {
  const router = useRouter();
  const [form, setForm] = useState({
    questType: initial.questType,
    title: initial.title,
    description: initial.description,
    targetCount: initial.targetCount,
    windowDays: initial.windowDays,
    pointsReward: initial.pointsReward,
    brandName: initial.brandName,
    benefitDescription: initial.benefitDescription,
    startsAt: toDateInputValue(initial.startsAt),
    endsAt: toDateInputValue(initial.endsAt),
    isPublished: initial.isPublished,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: QuestInput = {
      questType: form.questType,
      title: form.title,
      description: form.description,
      targetCount: Number(form.targetCount),
      windowDays: Number(form.windowDays),
      pointsReward: Number(form.pointsReward),
      brandName: form.brandName,
      benefitDescription: form.benefitDescription,
      startsAt: new Date(`${form.startsAt}T00:00:00`).toISOString(),
      endsAt: new Date(`${form.endsAt}T23:59:59`).toISOString(),
      isPublished: form.isPublished,
    };

    const res = initial.id
      ? await updateQuestAction(initial.id, payload)
      : await createQuestAction(payload);

    // Si el server action redirige (caso ok), esta línea no se alcanza —
    // Next lanza una excepción especial de redirect que no pasa por acá.
    if (!res.ok) {
      setError(res.error);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
      <div>
        <label className="text-sm font-semibold text-text">Tipo de quest</label>
        <select
          value={form.questType}
          onChange={(e) => setForm((f) => ({ ...f, questType: e.target.value as QuestType }))}
          className="mt-2 w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-text focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
        >
          {QUEST_TYPES.map((t) => (
            <option key={t} value={t}>
              {QUEST_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Título"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        placeholder="Ej. Semana activa"
        required
      />

      <div>
        <label className="text-sm font-semibold text-text">Descripción</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          placeholder="Lo que ve el usuario en /comunidad"
          className="mt-2 w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Input
          label="Meta"
          type="number"
          min={1}
          value={form.targetCount}
          onChange={(e) => setForm((f) => ({ ...f, targetCount: Number(e.target.value) }))}
        />
        <Input
          label="Ventana (días)"
          type="number"
          min={1}
          value={form.windowDays}
          onChange={(e) => setForm((f) => ({ ...f, windowDays: Number(e.target.value) }))}
        />
        <Input
          label="Puntos"
          type="number"
          min={1}
          value={form.pointsReward}
          onChange={(e) => setForm((f) => ({ ...f, pointsReward: Number(e.target.value) }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Fecha de inicio"
          type="date"
          value={form.startsAt}
          onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
        />
        <Input
          label="Fecha de fin"
          type="date"
          value={form.endsAt}
          onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
        />
      </div>

      <div className="rounded-xl border border-dashed border-border p-4">
        <p className="text-sm font-semibold text-text">Beneficio de marca aliada (opcional)</p>
        <p className="mt-1 text-xs text-text-muted">
          El canje real todavía no existe — al completarse, el usuario solo ve
          &ldquo;beneficio desbloqueado&rdquo;.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Marca"
            value={form.brandName}
            onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
            placeholder="Ej. Zara"
          />
          <Input
            label="Beneficio"
            value={form.benefitDescription}
            onChange={(e) => setForm((f) => ({ ...f, benefitDescription: e.target.value }))}
            placeholder="Ej. 15% de descuento"
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm font-medium text-text">
        <input
          type="checkbox"
          checked={form.isPublished}
          onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/15"
        />
        Publicado (visible en /comunidad)
      </label>

      {error ? (
        <p role="alert" className="rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" isLoading={saving} loadingText="Guardando…">
          {initial.id ? "Guardar cambios" : "Crear quest"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/quests")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
