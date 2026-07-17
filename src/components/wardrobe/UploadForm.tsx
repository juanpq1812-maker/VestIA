// Formulario para subir una prenda al armario.
//
// Dos modos de entrada:
//   - Cámara  → input con capture="environment" (abre cámara en mobile)
//   - Galería → input sin capture (abre galería del carrete)
//
// Tras seleccionar la foto, analiza automáticamente con Claude Vision y
// pre-llena categoría, subcategoría, color y ocasiones.

"use client";

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type TouchEvent,
} from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Chip from "@/components/onboarding/Chip";
import CameraTipsModal from "@/components/wardrobe/CameraTipsModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { recordPetAction } from "@/lib/pet/actions";
import {
  CLOTHING_IMAGES_BUCKET,
  buildClothingImagePath,
} from "@/lib/storage/clothingImages";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  BASIC_COLORS,
  COLOR_PALETTE,
  COMPRESS_MAX_WIDTH_OR_HEIGHT,
  COMPRESS_QUALITY,
  ITEM_OCCASIONS,
  MAX_COMPRESSED_BYTES,
  NAME_MAX_LENGTH,
  SUBCATEGORIES,
} from "@/lib/wardrobe/constants";
import {
  CAMERA_DOWNSCALE_MAX_PX,
  base64ToBlob,
  bytesToReadable,
  downscaleToMaxPx,
} from "@/lib/wardrobe/imageUtils";
import {
  hexToColorName,
  mapAiOccasions,
  matchColorToPalette,
  matchSubcategory,
} from "@/lib/wardrobe/aiMapping";
import {
  CLOTHING_CATEGORIES,
  type ClothingCategory,
} from "@/types/database";
import {
  analyzeClothingImageAction,
  removeBackgroundAction,
  type AIClothingAnalysis,
} from "@/app/wardrobe/upload/actions";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type FieldErrors = {
  image?: string;
  category?: string;
  subcategory?: string;
  color?: string;
  occasions?: string;
  name?: string;
};


// visibleImg is used only for coordinate mapping (bounding rect).
// srcImg is the actual image drawn to canvas — must be the downscaled
// eyedropper version (max 800×800) to avoid OOM on Android.
function extractPixelColor(
  visibleImg: HTMLImageElement,
  srcImg: HTMLImageElement,
  clientX: number,
  clientY: number
): string | null {
  const rect = visibleImg.getBoundingClientRect();
  const nx = (clientX - rect.left) / rect.width;
  const ny = (clientY - rect.top) / rect.height;
  if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return null;

  // Draw only the single target pixel into a 1×1 canvas to minimise memory.
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const sx = nx * srcImg.naturalWidth;
  const sy = ny * srcImg.naturalHeight;
  ctx.drawImage(srcImg, sx, sy, 1, 1, 0, 0, 1, 1);

  try {
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    return hexToColorName(hex);
  } catch {
    return null;
  }
}

// ── Helpers generales ─────────────────────────────────────────────────────────

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

// ── Grupos de color para la sección expandible ────────────────────────────────

const COLOR_GROUPS_EXPANDED = [
  { label: "Neutros", colors: ["negro", "blanco", "gris", "beige", "café"] },
  { label: "Colores", colors: ["azul", "rojo", "verde", "amarillo", "naranja", "rosa", "morado"] },
  { label: "Especial", colors: ["multicolor"] },
];

// ── Círculo de color (sub-componente) ─────────────────────────────────────────

function ColorCircle({
  name,
  swatch,
  contrastText,
  selected,
  onSelect,
}: {
  name: string;
  swatch: string;
  contrastText: "light" | "dark";
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={name}
      title={name}
      onClick={onSelect}
      className={[
        "group flex flex-col items-center gap-1.5 rounded-md p-1 transition-transform",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected ? "scale-105" : "hover:scale-105",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-10 w-10 items-center justify-center rounded-full transition-shadow",
          selected
            ? "ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-md"
            : name === "blanco"
              ? "ring-1 ring-border"
              : "shadow-sm",
        ].join(" ")}
        style={{ background: swatch }}
        aria-hidden="true"
      >
        {selected ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={contrastText === "light" ? "#fff" : "#111"}
            strokeWidth="3"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        ) : null}
      </span>
      <span className="text-[11px] capitalize text-text-muted">{name}</span>
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UploadForm() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const eyedropperImgRef = useRef<HTMLImageElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [eyedropperSrc, setEyedropperSrc] = useState<string | null>(null);
  const [category, setCategory] = useState<ClothingCategory | "">("");
  const [subcategory, setSubcategory] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [occasions, setOccasions] = useState<string[]>([]);
  const [name, setName] = useState<string>("");

  // IA analysis
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<AIClothingAnalysis["confianza"] | null>(null);
  const [aiDetectedLabel, setAiDetectedLabel] = useState<string | null>(null);

  // Eyedropper
  const [eyedropperActive, setEyedropperActive] = useState(false);
  const [colorBeforeEyedropper, setColorBeforeEyedropper] = useState<string>("");

  // UI state
  const [coloresExpanded, setColoresExpanded] = useState(false);
  const [showCameraTips, setShowCameraTips] = useState(false);
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

  async function analyzeImage(selectedFile: File) {
    setAiAnalyzing(true);
    setAiAnalyzed(false);
    setAiConfidence(null);
    setAiDetectedLabel(null);
    try {
      let forAI: File;
      try {
        forAI = await imageCompression(selectedFile, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: "image/jpeg",
          initialQuality: 0.8,
        });
      } catch {
        forAI = selectedFile;
      }

      const fd = new FormData();
      fd.append("image", forAI);

      const result = await analyzeClothingImageAction(fd);

      if (result.ok) {
        const { categoria, subcategoria, color_principal, color_hex, ocasiones, confianza } =
          result.data;

        const validCategories: ClothingCategory[] = [
          "top", "bottom", "dress", "outerwear", "footwear", "accessory", "body",
        ];
        if (categoria && validCategories.includes(categoria as ClothingCategory)) {
          setCategory(categoria as ClothingCategory);
          const matchedSub = matchSubcategory(categoria, subcategoria ?? "");
          if (matchedSub) setSubcategory(matchedSub);
        }

        if (color_principal || color_hex) {
          const matchedColor = matchColorToPalette(color_principal ?? "", color_hex ?? "");
          if (matchedColor) setColor(matchedColor);
        }

        const mappedOcasiones = mapAiOccasions(ocasiones ?? []);
        if (mappedOcasiones.length > 0) setOccasions(mappedOcasiones);

        setAiConfidence(confianza ?? "baja");

        const parts = [subcategoria, color_principal].filter(Boolean);
        if (parts.length > 0) setAiDetectedLabel(parts.join(" · "));
      }
    } catch {
      // Falla silenciosa — el formulario queda en blanco para que el usuario llene
    } finally {
      setAiAnalyzing(false);
      setAiAnalyzed(true);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
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
    if (eyedropperSrc) URL.revokeObjectURL(eyedropperSrc);
    setPreview(null);
    setFile(null);
    setEyedropperSrc(null);
    setCategory("");
    setSubcategory("");
    setColor("");
    setOccasions([]);
    setAiAnalyzed(false);
    setEyedropperActive(false);

    // Paso 1: redimensionar a máx 1200px ANTES de cualquier otra operación.
    // Las fotos de cámara Android llegan en full resolution (12-50 MP). Cargarlas
    // en memoria completas causa OOM. downscaleToMaxPx crea el objectURL, decodifica
    // el JPEG en un canvas pequeño y revoca el objectURL original de inmediato,
    // liberando el bitmap full-res antes de continuar.
    let workingFile = selected;
    try {
      workingFile = await downscaleToMaxPx(selected, CAMERA_DOWNSCALE_MAX_PX);
    } catch {
      workingFile = selected; // fallback: continuar con el original
    }

    setFile(workingFile);
    setPreview(URL.createObjectURL(workingFile));

    // Paso 2: versión reducida (máx 800×800) para el eyedropper (canvas 1×1).
    imageCompression(workingFile, {
      maxWidthOrHeight: 800,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.85,
    })
      .then((resized) => setEyedropperSrc(URL.createObjectURL(resized)))
      .catch(() => setEyedropperSrc(URL.createObjectURL(workingFile)));

    // Paso 3: análisis IA con la imagen ya reducida.
    analyzeImage(workingFile);
  }

  function handleCambiarFoto() {
    if (preview) URL.revokeObjectURL(preview);
    if (eyedropperSrc) URL.revokeObjectURL(eyedropperSrc);
    setFile(null);
    setPreview(null);
    setEyedropperSrc(null);
    setAiAnalyzing(false);
    setAiAnalyzed(false);
    setAiConfidence(null);
    setAiDetectedLabel(null);
    setEyedropperActive(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    clearFieldError("image");
  }

  function handleCategoria(cat: ClothingCategory) {
    if (cat === category) return;
    setCategory(cat);
    setSubcategory("");
    clearFieldError("category");
    clearFieldError("subcategory");
  }

  function handleActivateEyedropper() {
    setColorBeforeEyedropper(color);
    setEyedropperActive(true);
  }

  function handleCancelEyedropper() {
    setColor(colorBeforeEyedropper);
    setEyedropperActive(false);
  }

  function handleEyedropperPointer(clientX: number, clientY: number) {
    if (!previewImgRef.current) return;
    const srcImg = eyedropperImgRef.current ?? previewImgRef.current;
    const colorName = extractPixelColor(previewImgRef.current, srcImg, clientX, clientY);
    if (colorName) {
      setColor(colorName);
      clearFieldError("color");
    }
    setEyedropperActive(false);
  }

  function handleEyedropperClick(e: MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    handleEyedropperPointer(e.clientX, e.clientY);
  }

  function handleEyedropperTouch(e: TouchEvent<HTMLDivElement>) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (touch) handleEyedropperPointer(touch.clientX, touch.clientY);
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

      // Paso: eliminar fondo con Remove.bg. Si falla por cualquier motivo,
      // se sube la foto comprimida original como fallback.
      setProgress("Eliminando fondo…");
      let toUpload: File = comprimido;
      try {
        const fd = new FormData();
        fd.append("image", comprimido, comprimido.name);
        const bgResult = await removeBackgroundAction(fd);
        if (bgResult.ok) {
          const pngBlob = base64ToBlob(bgResult.base64, bgResult.contentType);
          toUpload = new File([pngBlob], "photo.png", { type: "image/png" });
        }
      } catch {
        // fallback silencioso — se usa comprimido
      }

      setProgress("Subiendo foto…");
      const uuid = crypto.randomUUID();
      const path = buildClothingImagePath({
        userId: user.id,
        fileName: toUpload.name,
        uuid,
      });

      const { error: uploadError } = await supabase.storage
        .from(CLOTHING_IMAGES_BUCKET)
        .upload(path, toUpload, {
          contentType: toUpload.type,
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

      recordPetAction("garment_uploaded").catch(() => {});

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

  function handleCameraClick() {
    if (localStorage.getItem("strandia_camera_tips_seen")) {
      cameraInputRef.current?.click();
    } else {
      setShowCameraTips(true);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {showCameraTips ? (
        <CameraTipsModal
          onConfirm={() => {
            setShowCameraTips(false);
            cameraInputRef.current?.click();
          }}
          onClose={() => setShowCameraTips(false)}
        />
      ) : null}

      <div className="flex justify-start">
        <a href="/wardrobe/upload" className="text-sm font-medium text-primary hover:underline">
          ← Volver al modo ráfaga
        </a>
      </div>

      {/* ── Foto ─────────────────────────────────────────────────────────── */}
      <Card padding="sm">
        {/* Contenedor con aspect ratio fijo — portrait como la prenda */}
        <div
          className={[
            "relative overflow-hidden rounded-lg",
            "aspect-[4/5]",
            !preview
              ? "border-2 border-dashed border-border bg-surface-2"
              : "border border-border",
          ].join(" ")}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={previewImgRef}
                src={preview}
                alt="Vista previa de la prenda"
                className="h-full w-full object-cover"
                draggable={false}
              />
              {eyedropperActive ? (
                <div
                  className="absolute inset-0"
                  style={{ cursor: "crosshair", zIndex: 10 }}
                  onClick={handleEyedropperClick}
                  onTouchStart={handleEyedropperTouch}
                  aria-label="Toca el color que quieres seleccionar"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") handleCancelEyedropper();
                  }}
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
                <svg
                  width="26"
                  height="26"
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
              <div className="text-center">
                <p className="text-sm font-semibold text-text">Sube una foto de tu prenda</p>
                <p className="mt-1 text-xs text-text-faint">JPG, PNG o WebP · Máx. 5 MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Imagen oculta (max 800×800) usada exclusivamente por el eyedropper */}
        {eyedropperSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={eyedropperImgRef}
            src={eyedropperSrc}
            alt=""
            aria-hidden="true"
            className="sr-only"
          />
        ) : null}

        {/* Controles bajo la foto */}
        {!preview ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCameraClick}
                aria-label="Tomar foto con la cámara"
                className="flex items-center justify-center gap-2 rounded-full border border-border bg-surface py-3 text-sm font-semibold text-text transition-all duration-200 ease-out hover:border-primary-mid hover:bg-primary-light hover:text-primary active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M3 7h4l2-3h6l2 3h4v12H3z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Cámara
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                aria-label="Elegir foto de la galería"
                className="flex items-center justify-center gap-2 rounded-full border border-border bg-surface py-3 text-sm font-semibold text-text transition-all duration-200 ease-out hover:border-primary-mid hover:bg-primary-light hover:text-primary active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Galería
              </button>
            </div>
            {/* Hidden file inputs — uno por modo para no manipular el DOM en runtime */}
            <input
              ref={cameraInputRef}
              id="photo-camera"
              type="file"
              accept={ALLOWED_MIME_TYPES.join(",")}
              capture="environment"
              className="sr-only"
              onChange={handleFileChange}
              aria-hidden="true"
            />
            <input
              ref={galleryInputRef}
              id="photo-gallery"
              type="file"
              accept={ALLOWED_MIME_TYPES.join(",")}
              className="sr-only"
              onChange={handleFileChange}
              aria-hidden="true"
            />
          </>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            {eyedropperActive ? (
              <div className="flex w-full flex-col items-center gap-2">
                <p className="text-sm font-medium text-primary">Toca el color en la foto de arriba</p>
                <Button variant="ghost" onClick={handleCancelEyedropper}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={handleCambiarFoto}
                  disabled={submitting}
                >
                  Cambiar foto
                </Button>
                {file ? (
                  <span className="text-xs text-text-faint">{bytesToReadable(file.size)}</span>
                ) : null}
              </>
            )}
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

      {/* ── Chip de análisis IA ───────────────────────────────────────────── */}
      {(aiAnalyzing || (aiAnalyzed && aiDetectedLabel)) ? (
        <div className="flex justify-center">
          {aiAnalyzing ? (
            <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary-light px-4 py-2.5 text-sm font-medium text-primary animate-pulse">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-hidden="true"
              />
              Detectando prenda…
            </div>
          ) : (
            <div
              className={[
                "flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium",
                aiConfidence === "alta"
                  ? "border-success/30 bg-success-light text-success"
                  : "border-warning/30 bg-warning-light text-warning",
              ].join(" ")}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2l2.09 6.26L20.18 10l-5.09 3.74 1.91 6.26L12 16.27l-5 3.73 1.91-6.26L3.82 10l6.09-1.74z" />
              </svg>
              Detectado: {aiDetectedLabel}
            </div>
          )}
        </div>
      ) : null}

      {/* ── Formulario (visible solo cuando hay foto y terminó el análisis) ── */}
      {preview && !aiAnalyzing ? (
        <>
          {/* Categoría */}
          <Card padding="md">
            <h2 className="font-display text-lg font-semibold text-text">Categoría</h2>
            <p className="mt-1 text-xs text-text-muted">Elige el tipo amplio de prenda.</p>
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
              <p
                role="alert"
                className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
              >
                {fieldErrors.category}
              </p>
            ) : null}
          </Card>

          {/* Subcategoría */}
          <Card padding="md">
            <h2 className="font-display text-lg font-semibold text-text">Subcategoría</h2>
            <p className="mt-1 text-xs text-text-muted">
              {category
                ? "Especificá qué tipo de prenda es dentro de la categoría."
                : "Primero elegí una categoría arriba."}
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-text">Color principal</h2>
                <p className="mt-1 text-xs text-text-muted">
                  Elige el color que más predomina en la prenda.
                </p>
              </div>
              {!eyedropperActive ? (
                <button
                  type="button"
                  onClick={handleActivateEyedropper}
                  className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-primary-mid hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  title="Seleccionar color directamente de la foto"
                >
                  De la foto
                </button>
              ) : null}
            </div>

            {/* Fila horizontal de colores básicos con scroll invisible */}
            <div
              role="radiogroup"
              aria-label="Color principal"
              className="mt-4 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {COLOR_PALETTE.filter((c) => BASIC_COLORS.includes(c.name)).map((c) => (
                <ColorCircle
                  key={c.name}
                  name={c.name}
                  swatch={c.swatch}
                  contrastText={c.contrastText}
                  selected={color === c.name}
                  onSelect={() => {
                    setColor(c.name);
                    clearFieldError("color");
                  }}
                />
              ))}
            </div>

            {/* Botón para expandir todos los colores */}
            <button
              type="button"
              onClick={() => setColoresExpanded((v) => !v)}
              className="mt-3 w-full rounded-xl border border-border py-2.5 text-sm font-medium text-primary transition-colors duration-200 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {coloresExpanded ? "Ver menos colores −" : "Ver más colores +"}
            </button>

            {/* Todos los colores agrupados */}
            {coloresExpanded ? (
              <div className="mt-5 space-y-5 motion-safe:animate-[fadeInUp_180ms_ease-out]">
                {COLOR_GROUPS_EXPANDED.map((group) => (
                  <div key={group.label}>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-text-muted">
                      {group.label}
                    </p>
                    <div
                      role="radiogroup"
                      aria-label={group.label}
                      className="flex flex-wrap gap-2"
                    >
                      {COLOR_PALETTE.filter((c) => group.colors.includes(c.name)).map((c) => (
                        <ColorCircle
                          key={c.name}
                          name={c.name}
                          swatch={c.swatch}
                          contrastText={c.contrastText}
                          selected={color === c.name}
                          onSelect={() => {
                            setColor(c.name);
                            clearFieldError("color");
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

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
              ¿Para qué ocasiones sirve?
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Marcá todas las que apliquen (mínimo 1). Esto ayuda a la IA a combinarla mejor.
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
        </>
      ) : null}

      {/* Cancelar cuando todavía no hay foto */}
      {!preview ? (
        <div className="flex justify-start">
          <Button variant="ghost" onClick={() => router.push("/wardrobe")}>
            Cancelar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
