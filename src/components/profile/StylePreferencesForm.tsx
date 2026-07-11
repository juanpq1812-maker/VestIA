// Formulario de /profile/style: editar estilos, ocasiones, tallas y medidas
// guardados en `user_preferences`. Reutiliza los chips del onboarding pero en
// una sola pantalla editable, con guardado explícito; al guardar con éxito
// redirige de vuelta a /profile.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Chip from "@/components/onboarding/Chip";
import {
  STYLE_TAGS,
  OCCASION_TAGS,
  TOP_SIZES,
  BOTTOM_SIZES,
} from "@/types/database";
import { saveStylePreferences } from "@/app/profile/style/actions";

export type StylePreferencesInitial = {
  styleTags: string[];
  favoriteOccasions: string[];
  topSize: string | null;
  bottomSize: string | null;
  shoeSize: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
};

type Props = {
  initial: StylePreferencesInitial;
};

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function parseNumber(value: string): number | null {
  const n = Number(value);
  return value.trim() === "" || Number.isNaN(n) ? null : n;
}

function numToInput(n: number | null): string {
  return n === null ? "" : String(n);
}

export default function StylePreferencesForm({ initial }: Props) {
  const router = useRouter();
  const [estilos, setEstilos] = useState<string[]>(initial.styleTags);
  const [ocasiones, setOcasiones] = useState<string[]>(initial.favoriteOccasions);
  const [topSize, setTopSize] = useState(initial.topSize ?? "");
  const [bottomSize, setBottomSize] = useState(initial.bottomSize ?? "");
  const [shoeSize, setShoeSize] = useState(numToInput(initial.shoeSize));
  const [chestCm, setChestCm] = useState(numToInput(initial.chestCm));
  const [waistCm, setWaistCm] = useState(numToInput(initial.waistCm));
  const [hipCm, setHipCm] = useState(numToInput(initial.hipCm));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    if (estilos.length === 0) {
      setError("Elige al menos un estilo.");
      return;
    }
    if (ocasiones.length === 0) {
      setError("Elige al menos una ocasión.");
      return;
    }

    startTransition(async () => {
      const result = await saveStylePreferences({
        styleTags: estilos,
        favoriteOccasions: ocasiones,
        topSize: topSize || null,
        bottomSize: bottomSize || null,
        shoeSize: parseNumber(shoeSize),
        chestCm: parseNumber(chestCm),
        waistCm: parseNumber(waistCm),
        hipCm: parseNumber(hipCm),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Vuelve al perfil; refresh para que el Server Component lea los
      // datos recién guardados.
      router.push("/profile");
      router.refresh();
    });
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* ── Estilos ─────────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-display text-xl font-semibold text-text">
          Tus estilos
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          La IA usa esto para sugerirte combinaciones que de verdad te gusten.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {STYLE_TAGS.map((tag) => (
            <Chip
              key={tag}
              active={estilos.includes(tag)}
              onClick={() => setEstilos((arr) => toggle(arr, tag))}
            >
              <span className="capitalize">{tag}</span>
            </Chip>
          ))}
        </div>
      </Card>

      {/* ── Ocasiones ───────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-display text-xl font-semibold text-text">
          Tus ocasiones
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Define qué outfits te generamos primero.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {OCCASION_TAGS.map((tag) => (
            <Chip
              key={tag}
              active={ocasiones.includes(tag)}
              onClick={() => setOcasiones((arr) => toggle(arr, tag))}
            >
              <span className="capitalize">{tag}</span>
            </Chip>
          ))}
        </div>
      </Card>

      {/* ── Tallas ──────────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-display text-xl font-semibold text-text">
          Tus tallas
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Nos ayudan a sugerirte combinaciones realistas.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Select
            label="Top"
            value={topSize}
            onChange={setTopSize}
            options={TOP_SIZES}
            placeholder="Elige talla"
          />
          <Select
            label="Bottom"
            value={bottomSize}
            onChange={setBottomSize}
            options={BOTTOM_SIZES}
            placeholder="Elige talla"
          />
          <Input
            label="Calzado (número)"
            type="number"
            inputMode="decimal"
            min={20}
            max={55}
            step={0.5}
            value={shoeSize}
            onChange={(e) => setShoeSize(e.target.value)}
            placeholder="Ej: 40"
          />
        </div>
      </Card>

      {/* ── Medidas ─────────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-display text-xl font-semibold text-text">
          Medidas (opcional)
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          En cm. Afinan todavía más las recomendaciones.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <MedidaInput label="Pecho (cm)" value={chestCm} onChange={setChestCm} />
          <MedidaInput label="Cintura (cm)" value={waistCm} onChange={setWaistCm} />
          <MedidaInput label="Cadera (cm)" value={hipCm} onChange={setHipCm} />
        </div>
      </Card>

      {error ? (
        <p
          role="alert"
          className="rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      ) : null}

      <Button
        onClick={guardar}
        isLoading={isPending}
        loadingText="Guardando…"
        fullWidth
      >
        Guardar cambios
      </Button>
    </div>
  );
}

type SelectProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder: string;
};

function Select({ label, value, onChange, options, placeholder }: SelectProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-border bg-surface px-4 py-3 text-base text-text transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function MedidaInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      label={label}
      type="number"
      inputMode="decimal"
      min={20}
      max={250}
      step={0.5}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Ej: 90"
    />
  );
}
