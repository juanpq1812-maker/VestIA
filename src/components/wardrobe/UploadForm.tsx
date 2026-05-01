// Formulario para subir una prenda nueva al armario.
//
// Vive como Client Component porque:
//   - lee un File del input,
//   - lo comprime/redimensiona con `browser-image-compression`,
//   - lo sube directo a Supabase Storage desde el navegador,
//   - inserta la fila en `clothing_items` (RLS deja al usuario escribir solo
//     en sus propias filas, ver `0003_clothing_items.sql`).
//
// El cliente del navegador autentica con la cookie de Supabase, asi que no
// hace falta pasar tokens manualmente.

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
  MAX_FILE_BYTES,
  NAME_MAX_LENGTH,
  SUBCATEGORIES,
} from "@/lib/wardrobe/constants";
import {
  CLOTHING_CATEGORIES,
  type ClothingCategory,
} from "@/types/database";

type FieldErrors = {
  image?: string;
  category?: string;
  subcategory?: string;
  color?: string;
  occasions?: string;
  name?: string;
};

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function bytesToReadable(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadForm() {
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
    if (selected.size > MAX_FILE_BYTES) {
      setFieldErrors((prev) => ({
        ...prev,
        image: `La imagen pesa ${bytesToReadable(selected.size)}. El maximo permitido es 5 MB.`,
      }));
      return;
    }

    clearFieldError("image");

    // Liberamos la URL previa para no fugar memoria.
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
    setSubcategory(""); // resetea: las opciones cambian.
    clearFieldError("category");
    clearFieldError("subcategory");
  }

  function validar(): FieldErrors {
    const errs: FieldErrors = {};
    if (!file) errs.image = "Sube una foto de la prenda.";
    if (!category) errs.category = "Elige una categoria.";
    if (!subcategory) errs.subcategory = "Elige una subcategoria.";
    if (!color) errs.color = "Selecciona el color principal.";
    if (occasions.length === 0)
      errs.occasions = "Marca al menos una ocasion para esta prenda.";
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
        setGeneralError("Tu sesion expiro. Vuelve a iniciar sesion.");
        return;
      }

      // 1) Comprimir/redimensionar antes de subir.
      let comprimido: File;
      try {
        comprimido = await imageCompression(file, {
          maxSizeMB: 5,
          maxWidthOrHeight: COMPRESS_MAX_WIDTH_OR_HEIGHT,
          initialQuality: COMPRESS_QUALITY,
          useWebWorker: true,
          fileType: file.type,
        });
      } catch {
        setGeneralError(
          "No pudimos procesar la imagen. Prueba con otra foto."
        );
        return;
      }

      // 2) Subir a Storage en {user_id}/{uuid}.{ext}.
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
          `No pudimos subir la imagen: ${uploadError.message}. Revisa tu conexion o vuelve a intentarlo.`
        );
        return;
      }

      // 3) Insertar la fila en clothing_items.
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
          // Guardamos el path tambien en image_url para poder reconstruir la
          // signed URL en /wardrobe; como el bucket es privado, no hay una
          // URL publica que podamos guardar.
          image_url: null,
        });

      if (insertError) {
        // Cleanup: si la insercion fallo, no dejes el archivo huerfano.
        await supabase.storage
          .from(CLOTHING_IMAGES_BUCKET)
          .remove([path])
          .catch(() => {
            /* best-effort */
          });
        setGeneralError(
          `No pudimos guardar la prenda: ${insertError.message}.`
        );
        return;
      }

      // 4) Listo: a /wardrobe con flag de exito.
      router.push("/wardrobe?uploaded=1");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error desconocido";
      setGeneralError(`Algo salio mal: ${msg}.`);
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
          Acepta JPG, PNG o WebP. Maximo 5 MB. La optimizamos antes de subir.
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
                Toca para subir o tomar una foto
              </p>
              <p className="mt-1 text-xs text-text-muted">
                En tu celular se abre la camara o la galeria.
              </p>
            </div>
            <input
              ref={fileInputRef}
              id="clothing-photo"
              type="file"
              accept={ALLOWED_MIME_TYPES.join(",")}
              capture="environment"
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
          <p
            role="alert"
            className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
          >
            {fieldErrors.image}
          </p>
        ) : null}
      </Card>

      {/* Categoria */}
      <Card padding="md">
        <h2 className="font-display text-lg font-semibold text-text">
          Categoria
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          Elige el tipo amplio de prenda.
        </p>
        <div
          role="radiogroup"
          aria-label="Categoria"
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
          <p
            role="alert"
            className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
          >
            {fieldErrors.category}
          </p>
        ) : null}
      </Card>

      {/* Subcategoria */}
      <Card padding="md">
        <h2 className="font-display text-lg font-semibold text-text">
          Subcategoria
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          {category
            ? "Especifica que tipo de prenda dentro de la categoria."
            : "Primero elige una categoria arriba."}
        </p>
        <div
          role="radiogroup"
          aria-label="Subcategoria"
          className="mt-3 flex flex-wrap gap-2"
        >
          {subcategoryOptions.length === 0 ? (
            <p className="text-sm text-text-faint">
              Las opciones aparecen al elegir la categoria.
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
          <p
            role="alert"
            className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
          >
            {fieldErrors.subcategory}
          </p>
        ) : null}
      </Card>

      {/* Color */}
      <Card padding="md">
        <h2 className="font-display text-lg font-semibold text-text">
          Color principal
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          Elige el color que mas predomina en la prenda.
        </p>
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
          <p
            role="alert"
            className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
          >
            {fieldErrors.color}
          </p>
        ) : null}
      </Card>

      {/* Ocasiones */}
      <Card padding="md">
        <h2 className="font-display text-lg font-semibold text-text">
          ¿Para que ocasiones sirve?
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          Marca todas las que apliquen (minimo 1). Esto ayuda a la IA a
          combinarla mejor.
        </p>
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
          <p
            role="alert"
            className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
          >
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

      {/* Error general + submit */}
      {generalError ? (
        <p
          role="alert"
          className="rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
        >
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
          loadingText={progress ?? "Subiendo…"}
        >
          Guardar prenda
        </Button>
      </div>
    </div>
  );
}
