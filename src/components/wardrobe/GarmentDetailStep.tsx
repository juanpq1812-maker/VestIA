// Paso final del flujo visual: confirmar la prenda detectada y completar
// color, ocasiones y nombre.
//
// Es UNA sola card, no un scroll de cards separadas: el ícono grande de la
// prenda, la paleta de colores justo debajo, y ocasiones + nombre como
// secciones compactas separadas por divisores en el MISMO contenedor. La idea
// es que se lea como una pantalla de confirmación, no como un formulario —
// cuando Vision viene con confianza alta, esto es lo único que ve el usuario
// antes de guardar.
//
// De ahí también que "Cambiar categoría" esté SIEMPRE visible, incluso en el
// caso feliz: es la única forma de corregir a la IA.

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
  /** Flecha de back: vuelve al paso del que se llegó (subcategorías o categorías). */
  onBack: () => void;
  backLabel: string;
  errors: { color?: string; occasions?: string; name?: string };
};

// Separador entre secciones de la card. Un divisor sutil en vez de cortar en
// cards distintas: mantiene todo como un solo bloque visual.
const SECTION = "mt-7 border-t border-divider pt-6";

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
  onBack,
  backLabel,
  errors,
}: Props) {
  const categoryLabel =
    CLOTHING_CATEGORIES.find((c) => c.value === category)?.label ?? "";

  return (
    <Card padding="lg">
      <div className="relative motion-safe:animate-[fadeIn_200ms_ease-out]">
        {/* Flecha de back — mismo patrón que la del grid de subcategorías.
            Absoluta para no descentrar el bloque del ícono. */}
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* ── Prenda identificada ─────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center">
          <span className="flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getSubcategoryIcon(subcategory, category)}
              alt=""
              aria-hidden="true"
              decoding="async"
              className="h-full w-full object-contain"
            />
          </span>

          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-primary">
            {categoryLabel}
          </p>
          <h2 className="mt-1 font-display text-3xl font-bold text-text">
            {subcategory}
          </h2>

          {aiDetectedLabel ? (
            <p className="mt-3 flex items-center gap-2 rounded-full border border-success/30 bg-success-light px-4 py-2 text-sm font-medium text-success">
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

          <button
            type="button"
            onClick={onChangeCategory}
            className="mt-3 rounded text-sm font-medium text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cambiar categoría
          </button>
        </div>

        {/* ── Color ───────────────────────────────────────────────────────── */}
        <div className={SECTION}>
          <ColorPicker
            align="center"
            value={color}
            onChange={onColorChange}
            onActivateEyedropper={onActivateEyedropper}
            eyedropperActive={eyedropperActive}
            error={errors.color}
          />
        </div>

        {/* ── Ocasiones ───────────────────────────────────────────────────── */}
        <div className={SECTION}>
          <h3 className="text-sm font-semibold text-text">
            ¿Para qué ocasiones sirve?
          </h3>
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
        </div>

        {/* ── Nombre opcional ─────────────────────────────────────────────── */}
        <div className={SECTION}>
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
        </div>
      </div>
    </Card>
  );
}
