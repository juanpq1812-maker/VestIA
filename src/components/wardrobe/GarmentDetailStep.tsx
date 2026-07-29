// Paso final del flujo visual: confirmar la prenda detectada y completar
// color, ocasiones y nombre.
//
// Cuando Vision viene con confianza alta el usuario aterriza directo acá, con
// todo pre-seleccionado — de ahí que "Cambiar categoría" esté SIEMPRE visible,
// incluso en ese caso: es la única forma de corregir a la IA.

"use client";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Chip from "@/components/onboarding/Chip";
import ColorPicker from "@/components/wardrobe/ColorPicker";
import { ITEM_OCCASIONS, NAME_MAX_LENGTH } from "@/lib/wardrobe/constants";
import { getSubcategoryIcon } from "@/lib/wardrobe/icons";
import { CLOTHING_CATEGORIES, type ClothingCategory } from "@/types/database";

type Props = {
  category: ClothingCategory;
  subcategory: string;
  /** "subcategoría · color" que devolvió Vision, para el chip de detección. */
  aiDetectedLabel?: string | null;
  color: string;
  onColorChange: (color: string) => void;
  onActivateEyedropper?: () => void;
  eyedropperActive?: boolean;
  occasions: string[];
  onToggleOccasion: (occasion: string) => void;
  name: string;
  onNameChange: (name: string) => void;
  onChangeCategory: () => void;
  errors: { color?: string; occasions?: string; name?: string };
};

export default function GarmentDetailStep({
  category,
  subcategory,
  aiDetectedLabel,
  color,
  onColorChange,
  onActivateEyedropper,
  eyedropperActive,
  occasions,
  onToggleOccasion,
  name,
  onNameChange,
  onChangeCategory,
  errors,
}: Props) {
  const categoryLabel =
    CLOTHING_CATEGORIES.find((c) => c.value === category)?.label ?? "";

  return (
    <div className="flex flex-col gap-6 motion-safe:animate-[fadeIn_200ms_ease-out]">
      {/* Prenda identificada */}
      <Card padding="md">
        <div className="flex items-center gap-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getSubcategoryIcon(subcategory, category)}
              alt=""
              aria-hidden="true"
              decoding="async"
              className="h-full w-full object-contain"
            />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {categoryLabel}
            </p>
            <h2 className="mt-0.5 font-display text-2xl font-bold text-text">
              {subcategory}
            </h2>
            <button
              type="button"
              onClick={onChangeCategory}
              className="mt-1 rounded text-sm font-medium text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cambiar categoría
            </button>
          </div>
        </div>

        {aiDetectedLabel ? (
          <p className="mt-4 flex items-center gap-2 rounded-full border border-success/30 bg-success-light px-4 py-2 text-sm font-medium text-success">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="shrink-0"
              aria-hidden="true"
            >
              <path d="M12 2l2.09 6.26L20.18 10l-5.09 3.74 1.91 6.26L12 16.27l-5 3.73 1.91-6.26L3.82 10l6.09-1.74z" />
            </svg>
            Detectado por IA: {aiDetectedLabel}
          </p>
        ) : null}
      </Card>

      {/* Color */}
      <Card padding="md">
        <ColorPicker
          value={color}
          onChange={onColorChange}
          onActivateEyedropper={onActivateEyedropper}
          eyedropperActive={eyedropperActive}
          error={errors.color}
        />
      </Card>

      {/* Ocasiones */}
      <Card padding="md">
        <h2 className="font-display text-lg font-semibold text-text">
          ¿Para qué ocasiones sirve?
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          Marca todas las que apliquen (mínimo 1). Esto ayuda a la IA a
          combinarla mejor.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ITEM_OCCASIONS.map((o) => (
            <Chip
              key={o}
              active={occasions.includes(o)}
              onClick={() => onToggleOccasion(o)}
            >
              {o}
            </Chip>
          ))}
        </div>
        {errors.occasions ? (
          <p
            role="alert"
            className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
          >
            {errors.occasions}
          </p>
        ) : null}
      </Card>

      {/* Nombre opcional */}
      <Card padding="md">
        <Input
          label="Nombre (opcional)"
          type="text"
          maxLength={NAME_MAX_LENGTH}
          placeholder="Camisa azul oxford"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          hint={`${name.length}/${NAME_MAX_LENGTH} caracteres`}
          error={errors.name}
        />
      </Card>
    </div>
  );
}
