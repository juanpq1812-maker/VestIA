// Formulario de edición de una prenda existente.
//
// Reutiliza la misma lógica de validación y UI que UploadForm, pero en lugar
// de subir imagen + insertar, actualiza la fila en clothing_items.
// La imagen no se puede cambiar aquí (solo datos de catalogación).

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Chip from "@/components/onboarding/Chip";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import {
  COLOR_PALETTE,
  ITEM_OCCASIONS,
  NAME_MAX_LENGTH,
  SUBCATEGORIES,
} from "@/lib/wardrobe/constants";
import {
  CLOTHING_CATEGORIES,
  type ClothingCategory,
  type ClothingItem,
} from "@/types/database";

type FieldErrors = {
  category?: string;
  subcategory?: string;
  color?: string;
  occasions?: string;
  name?: string;
};

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

type Props = {
  item: ClothingItem;
  imageUrl: string | null;
};

export default function EditItemForm({ item, imageUrl }: Props) {
  const router = useRouter();

  const [category, setCategory] = useState<ClothingCategory | "">(
    item.category ?? ""
  );
  const [subcategory, setSubcategory] = useState<string>(
    item.subcategory ?? ""
  );
  const [color, setColor] = useState<string>(item.primary_color ?? "");
  const [occasions, setOccasions] = useState<string[]>(item.occasions ?? []);
  const [name, setName] = useState<string>(item.name ?? "");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const subcategoryOptions = useMemo<readonly string[]>(() => {
    return category ? SUBCATEGORIES[category] : [];
  }, [category]);

  function clearFieldError(key: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }

  function handleCategoria(cat: ClothingCategory) {
    if (cat === category) return;
    setCategory(cat);
    setSubcategory("");
    clearFieldError("category");
    clearFieldError("subcategory");
  }

  function validar(): FieldErrors {
    const errs: FieldErrors = {};
    if (!category) errs.category = "Elige una categoría.";
    if (!subcategory) errs.subcategory = "Elige una subcategoría.";
    if (!color) errs.color = "Selecciona el color principal.";
    if (occasions.length === 0)
      errs.occasions = "Marcá al menos una ocasión para esta prenda.";
    if (name.length > NAME_MAX_LENGTH)
      errs.name = `El nombre no puede pasar de ${NAME_MAX_LENGTH} caracteres.`;
    return errs;
  }

  async function handleSubmit() {
    setGeneralError(null);
    const errs = validar();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0 || !category) return;

    setSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setGeneralError("Tu sesión expiró. Vuelve a iniciar sesión.");
        return;
      }

      const { error: updateError } = await supabase
        .from("clothing_items")
        .update({
          category,
          subcategory,
          name: name.trim() || null,
          primary_color: color,
          occasions,
        })
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (updateError) {
        setGeneralError(`No pudimos guardar los cambios: ${updateError.message}.`);
        return;
      }

      router.push("/wardrobe");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setGeneralError(`Algo salió mal: ${msg}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Preview de la foto (no editable) */}
      {imageUrl ? (
        <Card padding="md">
          <h2 className="font-display text-lg font-semibold text-text">
            Foto de la prenda
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            La foto no se puede cambiar desde aquí.
          </p>
          <div className="mt-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Foto de la prenda"
              className="max-h-64 w-auto rounded-lg border border-border object-contain"
            />
          </div>
        </Card>
      ) : null}

      {/* Categoria */}
      <Card padding="md">
        <h2 className="font-display text-lg font-semibold text-text">
          Categoría
        </h2>
        <div
          role="radiogroup"
          aria-label="Categoría"
          className="mt-3 flex flex-wrap gap-2"
        >
          {CLOTHING_CATEGORIES.map((cat) => (
            <Chip
              key={cat.value}
              role="radio"
              aria-checked={category === cat.value}
              active={category === cat.value}
              onClick={() => handleCategoria(cat.value)}
            >
              {cat.label}
            </Chip>
          ))}
        </div>
        {fieldErrors.category ? (
          <p role="alert" className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
            {fieldErrors.category}
          </p>
        ) : null}
      </Card>

      {/* Subcategoria */}
      <Card padding="md">
        <h2 className="font-display text-lg font-semibold text-text">
          Subcategoría
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          {category
            ? "Especificá qué tipo de prenda es."
            : "Primero elegí una categoría."}
        </p>
        <div
          role="radiogroup"
          aria-label="Subcategoría"
          className="mt-3 flex flex-wrap gap-2"
        >
          {subcategoryOptions.length === 0 ? (
            <p className="text-sm text-text-faint">
              Las opciones aparecen al elegir la categoría.
            </p>
          ) : (
            subcategoryOptions.map((opt) => (
              <Chip
                key={opt}
                role="radio"
                aria-checked={subcategory === opt}
                active={subcategory === opt}
                onClick={() => {
                  setSubcategory(opt);
                  clearFieldError("subcategory");
                }}
              >
                {opt}
              </Chip>
            ))
          )}
        </div>
        {fieldErrors.subcategory ? (
          <p role="alert" className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
            {fieldErrors.subcategory}
          </p>
        ) : null}
      </Card>

      {/* Color */}
      <Card padding="md">
        <h2 className="font-display text-lg font-semibold text-text">
          Color principal
        </h2>
        <div
          role="radiogroup"
          aria-label="Color principal"
          className="mt-4 flex flex-wrap gap-3"
        >
          {COLOR_PALETTE.map((c) => {
            const seleccionado = color === c.name;
            const esBlanco = c.name === "blanco";
            return (
              <button
                key={c.name}
                type="button"
                role="radio"
                aria-checked={seleccionado}
                aria-label={c.name}
                title={c.name}
                onClick={() => {
                  setColor(c.name);
                  clearFieldError("color");
                }}
                className={[
                  "group flex flex-col items-center gap-1.5 rounded-md p-1 transition-transform",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  seleccionado ? "scale-105" : "hover:scale-105",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-full transition-shadow",
                    seleccionado
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-md"
                      : esBlanco
                        ? "ring-1 ring-border"
                        : "shadow-sm",
                  ].join(" ")}
                  style={{ background: c.swatch }}
                  aria-hidden="true"
                >
                  {seleccionado ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={c.contrastText === "light" ? "#fff" : "#111"}
                      strokeWidth="3"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  ) : null}
                </span>
                <span className="text-[11px] capitalize text-text-muted">
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
        {fieldErrors.color ? (
          <p role="alert" className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
            {fieldErrors.color}
          </p>
        ) : null}
      </Card>

      {/* Ocasiones */}
      <Card padding="md">
        <h2 className="font-display text-lg font-semibold text-text">
          ¿Para qué ocasiones sirve?
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {ITEM_OCCASIONS.map((o) => (
            <Chip
              key={o}
              active={occasions.includes(o)}
              onClick={() => {
                setOccasions((arr) => toggle(arr, o));
                clearFieldError("occasions");
              }}
            >
              {o}
            </Chip>
          ))}
        </div>
        {fieldErrors.occasions ? (
          <p role="alert" className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
            {fieldErrors.occasions}
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
          onChange={(e) => {
            setName(e.target.value);
            clearFieldError("name");
          }}
          hint={`${name.length}/${NAME_MAX_LENGTH} caracteres`}
          error={fieldErrors.name}
        />
      </Card>

      {generalError ? (
        <p role="alert" className="rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
          {generalError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          variant="ghost"
          onClick={() => router.push("/wardrobe")}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          isLoading={submitting}
          loadingText="Guardando…"
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
