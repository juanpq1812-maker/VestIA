// Formulario de edición de una prenda existente.
//
// Reutiliza la misma lógica de validación y UI que UploadForm, pero en lugar
// de subir imagen + insertar, actualiza la fila en clothing_items.
// La imagen no se puede cambiar aquí (solo datos de catalogación).

"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Chip from "@/components/onboarding/Chip";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { CLOTHING_IMAGES_BUCKET, buildClothingImagePath } from "@/lib/storage/clothingImages";
import { subirMiniatura } from "@/lib/wardrobe/uploadThumbnail";
import { THUMBNAIL_CACHE_CONTROL } from "@/lib/wardrobe/thumbnails";
import { removeBackgroundWithGemini } from "@/app/wardrobe/upload/backgroundRemovalActions";
import PlanPaywall from "@/components/plans/PlanPaywall";
import {
  ALLOWED_MIME_TYPES,
  COLOR_PALETTE,
  ITEM_OCCASIONS,
  NAME_MAX_LENGTH,
  SUBCATEGORIES,
} from "@/lib/wardrobe/constants";
import {
  CAMERA_DOWNSCALE_MAX_PX,
  base64ToBlob,
  downscaleToMaxPx,
} from "@/lib/wardrobe/imageUtils";
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
  const retakeInputRef = useRef<HTMLInputElement>(null);

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
  // Guard de re-entrancia — mismo patrón que UploadForm/ReviewGrid.
  const submittingRef = useRef(false);

  // "Mejora esta foto": para prendas recortadas de una foto de outfit
  // completo, o que se guardaron sin fondo removido (ver `canRetake` más
  // abajo). La remoción de fondo con Gemini corre apenas se elige la foto
  // nueva; la subida a Storage queda para el submit.
  const [newPhoto, setNewPhoto] = useState<{ blob: Blob; previewUrl: string; backgroundRemoved: boolean } | null>(null);
  const [retakingPhoto, setRetakingPhoto] = useState(false);
  const [retakeError, setRetakeError] = useState<string | null>(null);
  const [photoImprovementPaywall, setPhotoImprovementPaywall] = useState(false);

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

  async function handleRetakeFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;

    if (!ALLOWED_MIME_TYPES.includes(selected.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      setRetakeError("Formato no permitido. Usa JPG, PNG o WebP.");
      return;
    }

    setRetakeError(null);
    setPhotoImprovementPaywall(false);
    setRetakingPhoto(true);
    try {
      const downscaled = await downscaleToMaxPx(selected, CAMERA_DOWNSCALE_MAX_PX).catch(
        () => selected
      );
      const fd = new FormData();
      fd.append("image", downscaled, downscaled.name);
      // `source: "photo_improvement"` marca esta llamada como el botón manual
      // de "Mejora esta foto" — es la señal que backgroundRemovalActions.ts usa
      // para gatear contra la cuota de plan (5 en total en free). El pipeline
      // automático de subida no manda este source, así que nunca la consume.
      fd.append("source", "photo_improvement");
      const result = await removeBackgroundWithGemini(fd);
      if (!result.ok) {
        if (result.reason === "plan_limit") {
          setPhotoImprovementPaywall(true);
        } else {
          setRetakeError("No pudimos procesar la foto. Prueba de nuevo.");
        }
        return;
      }
      const blob = base64ToBlob(result.base64, result.contentType);
      if (newPhoto) URL.revokeObjectURL(newPhoto.previewUrl);
      // `backgroundRemoved` viaja con la foto: si el recorte no surtió efecto,
      // la prenda se guarda con el flag en false y sigue ofreciendo "Mejora
      // esta foto" en vez de darse por arreglada.
      setNewPhoto({
        blob,
        previewUrl: URL.createObjectURL(blob),
        backgroundRemoved: result.backgroundRemoved,
      });
    } finally {
      setRetakingPhoto(false);
    }
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
      errs.occasions = "Marca al menos una ocasión para esta prenda.";
    if (name.length > NAME_MAX_LENGTH)
      errs.name = `El nombre no puede pasar de ${NAME_MAX_LENGTH} caracteres.`;
    return errs;
  }

  async function handleSubmit() {
    if (submittingRef.current) return;

    setGeneralError(null);
    const errs = validar();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0 || !category) return;

    submittingRef.current = true;
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

      let newImagePath: string | null = null;
      let newThumbnailPath: string | null = null;
      // Se captura junto al path para que TS pueda estrecharlo: dentro del
      // spread condicional de abajo ya no sabe que `newPhoto` no es null.
      let newBackgroundRemoved = false;
      if (newPhoto) {
        newImagePath = buildClothingImagePath({
          userId: user.id,
          fileName: "photo.png",
          uuid: crypto.randomUUID(),
        });
        const { error: uploadError } = await supabase.storage
          .from(CLOTHING_IMAGES_BUCKET)
          .upload(newImagePath, newPhoto.blob, {
            contentType: "image/png",
            upsert: false,
            cacheControl: THUMBNAIL_CACHE_CONTROL,
          });
        if (uploadError) {
          setGeneralError(`No pudimos subir la foto nueva: ${uploadError.message}.`);
          return;
        }
        // Miniatura de la foto nueva. Adicional: si falla queda null y la card
        // cae a la imagen completa.
        newBackgroundRemoved = newPhoto.backgroundRemoved;
        newThumbnailPath = await subirMiniatura(
          supabase,
          new File([newPhoto.blob], "photo.png", { type: "image/png" }),
          newImagePath
        );
      }

      const { error: updateError } = await supabase
        .from("clothing_items")
        .update({
          category,
          subcategory,
          name: name.trim() || null,
          primary_color: color,
          occasions,
          ...(newImagePath
            ? {
                image_path: newImagePath,
                thumbnail_path: newThumbnailPath,
                source: "individual",
                background_removed: newBackgroundRemoved,
                reconstructed: false,
                reconstruction_reason: null,
              }
            : {}),
        })
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (updateError) {
        setGeneralError(`No pudimos guardar los cambios: ${updateError.message}.`);
        return;
      }

      // Foto vieja: best-effort, un huérfano en Storage no rompe nada.
      if (newImagePath && item.image_path) {
        const viejos = [item.image_path, item.thumbnail_path].filter(
          (p): p is string => Boolean(p)
        );
        await supabase.storage
          .from(CLOTHING_IMAGES_BUCKET)
          .remove(viejos)
          .catch(() => {});
      }

      // Sin router.refresh(): llamarlo justo después de push() (fuera del
      // flujo de auth, el único caso donde este combo está probado) hace que
      // la transición de Next se cuelgue — el RSC de destino llega a
      // completarse en el servidor pero el navegador nunca conmuta de ruta.
      // push() a una ruta nueva ya trae datos frescos por sí solo.
      router.push("/wardrobe");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setGeneralError(`Algo salió mal: ${msg}.`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // Se puede retomar la foto si: (a) es un recorte de una foto de outfit
  // completo (calidad de origen menor), o (b) el pipeline de imagen falló
  // del todo y se guardó sin remover el fondo (background_removed === false)
  // — en ambos casos vale la pena reintentar con una foto nueva.
  const canRetake = item.source === "outfit_extraction" || item.background_removed === false;

  return (
    <div className="flex flex-col gap-6">
      {/* Preview de la foto */}
      {imageUrl ? (
        <Card padding="md">
          <h2 className="font-display text-lg font-semibold text-text">
            Foto de la prenda
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {item.source === "outfit_extraction"
              ? "Recortada de una foto de outfit completo — la calidad puede ser menor. Puedes tomarle una foto individual."
              : item.background_removed === false
                ? "No pudimos quitarle el fondo automáticamente. Puedes intentarlo de nuevo con una foto nueva."
                : "La foto no se puede cambiar desde aquí."}
          </p>
          <div className="mt-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={newPhoto?.previewUrl ?? imageUrl}
              alt="Foto de la prenda"
              className="max-h-64 w-auto rounded-lg border border-border object-contain"
            />
          </div>

          {canRetake ? (
            <div className="mt-4 flex flex-col items-center gap-2">
              <input
                ref={retakeInputRef}
                type="file"
                accept={ALLOWED_MIME_TYPES.join(",")}
                capture="environment"
                className="sr-only"
                onChange={handleRetakeFileChange}
                aria-hidden="true"
              />
              <Button
                variant="secondary"
                size="md"
                onClick={() => retakeInputRef.current?.click()}
                isLoading={retakingPhoto}
                loadingText="Procesando foto…"
              >
                {newPhoto ? "Tomar otra foto" : "Tomar foto nueva"}
              </Button>
              {newPhoto ? (
                <p className="text-xs text-success">Foto lista — se guarda con «Guardar cambios».</p>
              ) : null}
              {retakeError ? (
                <p role="alert" className="text-xs font-medium text-danger">
                  {retakeError}
                </p>
              ) : null}
              {photoImprovementPaywall ? (
                <div className="w-full">
                  <PlanPaywall
                    title="Ya usaste tus 5 mejoras de foto"
                    subtitle="Con StrandIA Premium las mejoras de foto son ilimitadas."
                  />
                </div>
              ) : null}
            </div>
          ) : null}
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
            ? "Especifica qué tipo de prenda es."
            : "Primero elige una categoría."}
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
