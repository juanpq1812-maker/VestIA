// Formulario para subir prenda(s) al armario.
//
// Tres modos de subida:
//   1. single-camera  → input con capture="environment" (abre cámara en mobile)
//   2. single-gallery → input sin capture (abre galería del carrete)
//   3. bulk           → input con multiple (varias fotos a la vez, máx 10)
//
// El flujo de subida individual (modos 1 y 2) mantiene toda la lógica
// original de metadatos obligatorios.
//
// El flujo bulk crea prendas con subcategory=null y category="top" como
// defaults; el usuario las categoriza después desde el banner en /wardrobe.

"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Chip from "@/components/onboarding/Chip";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import {
  CLOTHING_IMAGES_BUCKET,
  buildClothingImagePath,
} from "@/lib/storage/clothingImages";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  COLOR_PALETTE,
  COMPRESS_MAX_WIDTH_OR_HEIGHT,
  COMPRESS_QUALITY,
  ITEM_OCCASIONS,
  MAX_COMPRESSED_BYTES,
  NAME_MAX_LENGTH,
  SUBCATEGORIES,
} from "@/lib/wardrobe/constants";
import {
  CLOTHING_CATEGORIES,
  type ClothingCategory,
} from "@/types/database";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type UploadMode = "single-camera" | "single-gallery" | "bulk";

type FieldErrors = {
  image?: string;
  category?: string;
  subcategory?: string;
  color?: string;
  occasions?: string;
  name?: string;
};

type BulkFileResult = { name: string; ok: boolean; error?: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function bytesToReadable(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const BULK_MAX_FILES = 10;
const BULK_CONCURRENCY = 3; // subidas en paralelo

// ── Componente principal ──────────────────────────────────────────────────────

export default function UploadForm() {
  const router = useRouter();
  const [mode, setMode] = useState<UploadMode>("single-camera");

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de modo */}
      <Card padding="md">
        <h2 className="font-display text-lg font-semibold text-text">
          ¿Cómo quieres agregar la prenda?
        </h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <ModeButton
            icon="📸"
            label="Tomar foto"
            active={mode === "single-camera"}
            onClick={() => setMode("single-camera")}
          />
          <ModeButton
            icon="🖼️"
            label="Elegir de galería"
            active={mode === "single-gallery"}
            onClick={() => setMode("single-gallery")}
          />
          <ModeButton
            icon="🖼️🖼️"
            label="Subir varias a la vez"
            active={mode === "bulk"}
            onClick={() => setMode("bulk")}
          />
        </div>
      </Card>

      {mode === "bulk" ? (
        <BulkUploadSection />
      ) : (
        <SingleUploadForm mode={mode} />
      )}
    </div>
  );
}

function ModeButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-1 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary-light text-primary"
          : "border-border bg-surface text-text hover:border-primary-mid",
      ].join(" ")}
    >
      <span className="text-xl" aria-hidden="true">
        {icon}
      </span>
      {label}
    </button>
  );
}

// ── Subida individual ─────────────────────────────────────────────────────────

function SingleUploadForm({ mode }: { mode: "single-camera" | "single-gallery" }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<ClothingCategory | "">("");
  const [subcategory, setSubcategory] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [occasions, setOccasions] = useState<string[]>([]);
  const [name, setName] = useState<string>("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setGeneralError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (
      !ALLOWED_MIME_TYPES.includes(
        selected.type as (typeof ALLOWED_MIME_TYPES)[number]
      )
    ) {
      setFieldErrors((prev) => ({
        ...prev,
        image: `Formato no permitido. Usa ${ALLOWED_EXTENSIONS.join(", ")}.`,
      }));
      return;
    }

    clearFieldError("image");
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function handleCambiarFoto() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    clearFieldError("image");
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
    if (!file) errs.image = "Sube una foto de la prenda.";
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
    if (Object.keys(errs).length > 0 || !file || !category) return;

    setSubmitting(true);
    setProgress("Optimizando imagen…");

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

      let comprimido: File;
      try {
        comprimido = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: COMPRESS_MAX_WIDTH_OR_HEIGHT,
          useWebWorker: true,
          fileType: "image/webp",
          initialQuality: COMPRESS_QUALITY,
        });
      } catch {
        setGeneralError("No pudimos procesar la imagen. Prueba con otra foto.");
        return;
      }

      if (comprimido.size > MAX_COMPRESSED_BYTES) {
        setGeneralError(
          `La imagen comprimida pesa ${bytesToReadable(comprimido.size)}. Prueba con una foto de menor resolución.`
        );
        return;
      }

      setProgress("Subiendo foto…");
      const uuid = crypto.randomUUID();
      const path = buildClothingImagePath({
        userId: user.id,
        fileName: file.name,
        uuid,
      });

      const { error: uploadError } = await supabase.storage
        .from(CLOTHING_IMAGES_BUCKET)
        .upload(path, comprimido, {
          contentType: comprimido.type,
          upsert: false,
        });

      if (uploadError) {
        setGeneralError(
          `No pudimos subir la imagen: ${uploadError.message}. Revisá tu conexión o volvé a intentarlo.`
        );
        return;
      }

      setProgress("Guardando prenda…");
      const { error: insertError } = await supabase
        .from("clothing_items")
        .insert({
          user_id: user.id,
          category,
          subcategory,
          name: name.trim() || null,
          primary_color: color,
          occasions,
          image_path: path,
          image_url: null,
        });

      if (insertError) {
        await supabase.storage
          .from(CLOTHING_IMAGES_BUCKET)
          .remove([path])
          .catch(() => {});
        setGeneralError(`No pudimos guardar la prenda: ${insertError.message}.`);
        return;
      }

      router.push("/wardrobe?uploaded=1");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setGeneralError(`Algo salió mal: ${msg}.`);
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Foto */}
      <Card padding="md">
        <h2 className="font-display text-lg font-semibold text-text">
          Foto de la prenda
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          Acepta JPG, PNG o WebP. Máximo 5 MB. La optimizamos antes de subir.
        </p>

        {!preview ? (
          <label
            htmlFor="clothing-photo"
            className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface-2 p-8 text-center transition-colors hover:border-primary-mid"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 7h4l2-3h6l2 3h4v12H3z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-text">
                {mode === "single-camera"
                  ? "Toca para tomar una foto"
                  : "Toca para elegir una foto de tu galería"}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {mode === "single-camera"
                  ? "Abre la cámara directamente."
                  : "Selecciona una foto de tu carrete."}
              </p>
            </div>
            <input
              ref={fileInputRef}
              id="clothing-photo"
              type="file"
              accept={ALLOWED_MIME_TYPES.join(",")}
              {...(mode === "single-camera" ? { capture: "environment" } : {})}
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Vista previa de la prenda"
              className="max-h-80 w-auto rounded-lg border border-border object-contain"
            />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="ghost"
                onClick={handleCambiarFoto}
                disabled={submitting}
              >
                Cambiar foto
              </Button>
              {file ? (
                <span className="text-xs text-text-muted">
                  {file.name} · {bytesToReadable(file.size)}
                </span>
              ) : null}
            </div>
          </div>
        )}

        {fieldErrors.image ? (
          <p role="alert" className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
            {fieldErrors.image}
          </p>
        ) : null}
      </Card>

      {/* Categoria */}
      <Card padding="md">
        <h2 className="font-display text-lg font-semibold text-text">Categoría</h2>
        <p className="mt-1 text-xs text-text-muted">Elige el tipo amplio de prenda.</p>
        <div role="radiogroup" aria-label="Categoría" className="mt-3 flex flex-wrap gap-2">
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
        <h2 className="font-display text-lg font-semibold text-text">Subcategoría</h2>
        <p className="mt-1 text-xs text-text-muted">
          {category ? "Especificá qué tipo de prenda es dentro de la categoría." : "Primero elegí una categoría arriba."}
        </p>
        <div role="radiogroup" aria-label="Subcategoría" className="mt-3 flex flex-wrap gap-2">
          {subcategoryOptions.length === 0 ? (
            <p className="text-sm text-text-faint">Las opciones aparecen al elegir la categoría.</p>
          ) : (
            subcategoryOptions.map((opt) => (
              <Chip
                key={opt}
                role="radio"
                aria-checked={subcategory === opt}
                active={subcategory === opt}
                onClick={() => { setSubcategory(opt); clearFieldError("subcategory"); }}
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
        <h2 className="font-display text-lg font-semibold text-text">Color principal</h2>
        <p className="mt-1 text-xs text-text-muted">Elige el color que más predomina en la prenda.</p>
        <div role="radiogroup" aria-label="Color principal" className="mt-4 flex flex-wrap gap-3">
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
                onClick={() => { setColor(c.name); clearFieldError("color"); }}
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
                      : esBlanco ? "ring-1 ring-border" : "shadow-sm",
                  ].join(" ")}
                  style={{ background: c.swatch }}
                  aria-hidden="true"
                >
                  {seleccionado ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke={c.contrastText === "light" ? "#fff" : "#111"} strokeWidth="3">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  ) : null}
                </span>
                <span className="text-[11px] capitalize text-text-muted">{c.name}</span>
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
        <h2 className="font-display text-lg font-semibold text-text">¿Para qué ocasiones sirve?</h2>
        <p className="mt-1 text-xs text-text-muted">
          Marcá todas las que apliquen (mínimo 1). Esto ayuda a la IA a combinarla mejor.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ITEM_OCCASIONS.map((o) => (
            <Chip
              key={o}
              active={occasions.includes(o)}
              onClick={() => { setOccasions((arr) => toggle(arr, o)); clearFieldError("occasions"); }}
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
          onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
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
        <Button variant="ghost" onClick={() => router.push("/wardrobe")} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} isLoading={submitting} loadingText={progress ?? "Subiendo…"}>
          Guardar prenda
        </Button>
      </div>
    </div>
  );
}

// ── Subida múltiple ───────────────────────────────────────────────────────────

function BulkUploadSection() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<BulkFileResult[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    setResults(null);
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (files.length > BULK_MAX_FILES) {
      setFileError(`Puedes subir hasta ${BULK_MAX_FILES} fotos a la vez. Seleccionaste ${files.length}.`);
      return;
    }
    setSelectedFiles(files);
  }

  async function handleUpload() {
    if (selectedFiles.length === 0 || uploading) return;

    setUploading(true);
    setResults(null);
    setProgress({ done: 0, total: selectedFiles.length });

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setFileError("Tu sesión expiró. Vuelve a iniciar sesión.");
      setUploading(false);
      setProgress(null);
      return;
    }

    const allResults: BulkFileResult[] = new Array(selectedFiles.length);
    let doneSoFar = 0;

    // Procesar en lotes de BULK_CONCURRENCY para no saturar Supabase
    for (let i = 0; i < selectedFiles.length; i += BULK_CONCURRENCY) {
      const batch = selectedFiles.slice(i, i + BULK_CONCURRENCY);

      await Promise.all(
        batch.map(async (file, batchIdx) => {
          const globalIdx = i + batchIdx;
          try {
            // Comprimir
            let comprimido: File;
            try {
              comprimido = await imageCompression(file, {
                maxSizeMB: 1,
                maxWidthOrHeight: COMPRESS_MAX_WIDTH_OR_HEIGHT,
                useWebWorker: true,
                fileType: "image/webp",
                initialQuality: COMPRESS_QUALITY,
              });
            } catch {
              comprimido = file; // Si falla la compresión, subir original
            }

            // Subir a Storage
            const uuid = crypto.randomUUID();
            const path = buildClothingImagePath({
              userId: user.id,
              fileName: file.name,
              uuid,
            });

            const { error: uploadError } = await supabase.storage
              .from(CLOTHING_IMAGES_BUCKET)
              .upload(path, comprimido, {
                contentType: comprimido.type,
                upsert: false,
              });

            if (uploadError) throw new Error(uploadError.message);

            // Insertar en clothing_items con defaults (sin categorizar)
            const { error: insertError } = await supabase
              .from("clothing_items")
              .insert({
                user_id: user.id,
                category: "top" as const,  // default; usuario lo cambia en /edit
                subcategory: null,          // null = "sin categorizar" (muestra badge)
                name: null,
                primary_color: null,
                occasions: [],
                image_path: path,
                image_url: null,
              });

            if (insertError) {
              await supabase.storage
                .from(CLOTHING_IMAGES_BUCKET)
                .remove([path])
                .catch(() => {});
              throw new Error(insertError.message);
            }

            allResults[globalIdx] = { name: file.name, ok: true };
          } catch (err) {
            allResults[globalIdx] = {
              name: file.name,
              ok: false,
              error: err instanceof Error ? err.message : "Error desconocido",
            };
          }

          doneSoFar++;
          setProgress({ done: doneSoFar, total: selectedFiles.length });
        })
      );
    }

    setResults(allResults.filter(Boolean));
    setUploading(false);
    setProgress(null);

    const exitos = allResults.filter((r) => r?.ok).length;
    if (exitos > 0) {
      // Pequeño delay para que el usuario vea el resumen antes del redirect
      setTimeout(() => {
        router.push("/wardrobe");
        router.refresh();
      }, 2500);
    }
  }

  const exitosCount = results?.filter((r) => r.ok).length ?? 0;
  const erroresCount = results?.filter((r) => !r.ok).length ?? 0;
  const doneOk = results !== null && exitosCount > 0;

  return (
    <Card padding="md">
      <h2 className="font-display text-lg font-semibold text-text">
        Subir varias fotos a la vez
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Selecciona hasta {BULK_MAX_FILES} fotos de tu galería. Las prendas se
        crean como &quot;sin categorizar&quot; y las completás después.
      </p>

      {!uploading && results === null ? (
        <div className="mt-5">
          <label
            htmlFor="bulk-photos"
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface-2 p-8 text-center transition-colors hover:border-primary-mid"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-text">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} foto${selectedFiles.length > 1 ? "s" : ""} seleccionada${selectedFiles.length > 1 ? "s" : ""}`
                  : "Toca para seleccionar fotos"}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Máximo {BULK_MAX_FILES} fotos · JPG, PNG o WebP
              </p>
            </div>
            <input
              ref={fileInputRef}
              id="bulk-photos"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          {fileError ? (
            <p role="alert" className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
              {fileError}
            </p>
          ) : null}

          {selectedFiles.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs text-text-muted mb-2">
                Vista previa de nombres:
              </p>
              <ul className="mb-4 max-h-28 overflow-y-auto rounded-lg border border-border bg-surface p-3 text-xs text-text-muted space-y-1">
                {selectedFiles.map((f, i) => (
                  <li key={i} className="truncate">
                    {i + 1}. {f.name}
                  </li>
                ))}
              </ul>
              <Button fullWidth onClick={handleUpload}>
                Subir {selectedFiles.length} foto{selectedFiles.length > 1 ? "s" : ""}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Progreso */}
      {uploading && progress ? (
        <div className="mt-5">
          <p className="text-center text-sm font-semibold text-text">
            Subiendo {progress.done} de {progress.total} foto{progress.total > 1 ? "s" : ""}…
          </p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-surface-offset">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-center text-xs text-text-muted">
            Esto puede tomar unos segundos…
          </p>
        </div>
      ) : null}

      {/* Resultado */}
      {results !== null && !uploading ? (
        <div className="mt-5 flex flex-col gap-3">
          {doneOk ? (
            <div className="rounded-xl border border-success bg-success-light px-4 py-3 text-sm text-success">
              <p className="font-semibold">
                ✅ {exitosCount} prenda{exitosCount > 1 ? "s" : ""} agregada{exitosCount > 1 ? "s" : ""} con éxito
              </p>
              <p className="mt-0.5 text-xs">
                Ahora podés categorizarlas desde tu armario. Redirigiendo…
              </p>
            </div>
          ) : null}

          {erroresCount > 0 ? (
            <div className="rounded-xl border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
              <p className="font-semibold mb-1">
                ⚠️ {erroresCount} foto{erroresCount > 1 ? "s" : ""} no se {erroresCount > 1 ? "pudieron subir" : "pudo subir"}:
              </p>
              <ul className="space-y-0.5 text-xs">
                {results
                  .filter((r) => !r.ok)
                  .map((r, i) => (
                    <li key={i} className="truncate">
                      • {r.name}: {r.error}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {!doneOk ? (
            <Button
              variant="ghost"
              onClick={() => {
                setResults(null);
                setSelectedFiles([]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Intentar de nuevo
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
