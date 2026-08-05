// Formulario para subir una prenda al armario.
//
// Dos modos de entrada:
//   - Cámara  → input con capture="environment" (abre cámara en mobile)
//   - Galería → input sin capture (abre galería del carrete)
//
// Tras seleccionar la foto, analiza automáticamente con Claude Vision y
// pre-llena categoría, subcategoría, color y ocasiones.
//
// El flujo es por pasos, no un formulario largo: la idea es que Vision haga el
// trabajo y el usuario solo confirme. Si la detección viene con confianza
// alta, se salta directo al paso de detalle con todo puesto; si no, el usuario
// recorre los grids de íconos con lo detectado pre-marcado. Ver `step` más
// abajo.

"use client";

import {
  useEffect,
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
import CameraTipsModal from "@/components/wardrobe/CameraTipsModal";
import CategoryGrid from "@/components/wardrobe/CategoryGrid";
import SubcategoryGrid from "@/components/wardrobe/SubcategoryGrid";
import GarmentDetailStep from "@/components/wardrobe/GarmentDetailStep";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { recordPetAction } from "@/lib/pet/actions";
import {
  CLOTHING_IMAGES_BUCKET,
  buildClothingImagePath,
} from "@/lib/storage/clothingImages";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  COMPRESS_MAX_WIDTH_OR_HEIGHT,
  COMPRESS_QUALITY,
  MAX_COMPRESSED_BYTES,
  NAME_MAX_LENGTH,
} from "@/lib/wardrobe/constants";
import {
  CAMERA_DOWNSCALE_MAX_PX,
  base64ToBlob,
  bytesToReadable,
  downscaleToMaxPx,
} from "@/lib/wardrobe/imageUtils";
import { subirMiniatura } from "@/lib/wardrobe/uploadThumbnail";
import { THUMBNAIL_CACHE_CONTROL } from "@/lib/wardrobe/thumbnails";
import {
  hexToColorName,
  mapAiOccasions,
  matchColorToPalette,
  matchSubcategory,
} from "@/lib/wardrobe/aiMapping";
import type { ClothingCategory } from "@/types/database";
import { analyzeClothingImageAction } from "@/app/wardrobe/upload/actions";
import { reconstructGarmentImageAction } from "@/app/wardrobe/upload/garmentReconstructionActions";
import { removeBackgroundWithGemini } from "@/app/wardrobe/upload/backgroundRemovalActions";
import type { AIClothingAnalysis } from "@/lib/wardrobe/clothingAnalysisSchema";

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

// Traduce el `reason` tipado que devuelven las acciones de imagen a algo
// diagnosticable. Va al console.error y al aviso que ve el usuario — antes
// estos valores se descartaban por completo y un fallo del pipeline era
// indistinguible de un éxito.
function describeImageFailure(
  stage: string,
  result: { reason: string; resetInMinutes?: number }
): string {
  const { reason } = result;
  if (reason === "rate_limited") {
    return `${stage}: se agotó el cupo de IA de esta hora (se restablece en ${result.resetInMinutes ?? 60} min)`;
  }
  if (reason === "no_session") return `${stage}: la sesión expiró`;
  if (reason === "no_image") return `${stage}: la imagen no llegó al servidor`;
  return `${stage}: falló la generación (${reason})`;
}

// Etapas reales del pipeline de guardado, en orden — cada mensaje mapea a un
// % fijo del progreso. No es una barra falsa que avanza sola: solo se mueve
// cuando la etapa correspondiente realmente terminó, así que el % siempre
// refleja trabajo hecho de verdad.
const SAVE_PROGRESS_STAGES: Record<string, number> = {
  "Optimizando tu foto…": 15,
  "Puliendo los detalles con IA…": 65,
  "Quitando el fondo…": 65,
  "Subiendo tu prenda…": 88,
  "Guardando en tu armario…": 97,
  "¡Listo!": 100,
};

// ── Pasos del flujo ───────────────────────────────────────────────────────────
//
//   photo      → todavía no hay foto
//   analyzing  → Vision está mirando la foto
//   category   → grid de las 6 categorías
//   subcategory→ grid de subcategorías de la categoría elegida
//   detail     → confirmar prenda + color, ocasiones y nombre
//
// De `analyzing` se salta directo a `detail` cuando Vision viene con confianza
// alta (ver analyzeImage). El guardado solo se ofrece en `detail`.
type Step = "photo" | "analyzing" | "category" | "subcategory" | "detail";

// ── Componente principal ──────────────────────────────────────────────────────

export default function UploadForm() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const eyedropperImgRef = useRef<HTMLImageElement>(null);
  // Guard de re-entrancia: se lee y escribe de forma síncrona, así que un
  // segundo clic (o doble-tap en móvil, donde el `disabled` del botón puede
  // no haberse pintado todavía) se descarta ANTES de arrancar un segundo
  // insert. La protección visual del botón (isLoading/disabled) es la
  // primera línea de defensa, pero puede fallar por timing — este ref es la
  // que de verdad evita la prenda duplicada.
  const submittingRef = useRef(false);

  const [step, setStep] = useState<Step>("photo");
  // A dónde vuelve la flecha de back del paso `detail`: al paso del que se
  // llegó. Si el usuario recorrió el flujo manual, vuelve a `subcategory`; si
  // aterrizó directo por confianza alta, ese paso nunca existió y volver ahí
  // sería inventarle un paso que no vio — vuelve a `category`.
  const [detailBackStep, setDetailBackStep] = useState<"category" | "subcategory">("category");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [eyedropperSrc, setEyedropperSrc] = useState<string | null>(null);
  const [category, setCategory] = useState<ClothingCategory | "">("");
  const [subcategory, setSubcategory] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [occasions, setOccasions] = useState<string[]>([]);
  const [name, setName] = useState<string>("");

  // IA analysis
  const [aiConfidence, setAiConfidence] = useState<AIClothingAnalysis["confianza"] | null>(null);
  const [aiDetectedLabel, setAiDetectedLabel] = useState<string | null>(null);
  // Lo que detectó Vision, guardado aparte de `category`/`subcategory`. Con
  // confianza media/baja NO damos la detección por elegida — solo la
  // pre-marcamos en el grid (estado `hinted` del tile) y el usuario confirma.
  // Por eso hacen falta las dos parejas de estado y no una sola.
  const [aiCategory, setAiCategory] = useState<ClothingCategory | "">("");
  const [aiSubcategory, setAiSubcategory] = useState<string>("");
  // Motivo por el que Vision marcó la foto para reconstrucción con Gemini —
  // null = no hace falta. Se usa en handleSubmit para decidir el pipeline.
  const [reconstructionReason, setReconstructionReason] = useState<string | null>(null);
  // El booleano va aparte del motivo: es el que decide el pipeline. Vision
  // puede marcar needs_reconstruction=true y dejar el motivo en null, y en ese
  // caso la reconstrucción SÍ tiene que correr (ver handleSubmit).
  const [needsReconstruction, setNeedsReconstruction] = useState(false);
  // Auditoría: valor crudo de `subcategoria` que devolvió Vision cuando NO
  // matcheó contra SUBCATEGORIES (ver aiMapping.ts). El campo sigue siendo
  // obligatorio acá — el usuario lo completa a mano si Vision falló — pero
  // igual queremos saber que Vision se equivocó, para poder ampliar el
  // diccionario de sinónimos con casos reales.
  const [subcategoryAiRaw, setSubcategoryAiRaw] = useState<string | null>(null);

  // Eyedropper
  const [eyedropperActive, setEyedropperActive] = useState(false);
  const [colorBeforeEyedropper, setColorBeforeEyedropper] = useState<string>("");

  // UI state
  const [showCameraTips, setShowCameraTips] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // true durante la breve pausa de "¡Listo!" antes de navegar — mismo
  // `submitting`, pero el panel cambia de spinner a check verde.
  const [saveDone, setSaveDone] = useState(false);
  // true cuando el intento de guardado más reciente falló — mantiene el
  // panel abierto (en modo error) hasta que el usuario reintente o cancele,
  // en vez de dejarlo colgado o desaparecer sin explicación.
  const [saveFailed, setSaveFailed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (active && user) setUserId(user.id);
      });
    return () => {
      active = false;
    };
  }, []);
  const [progress, setProgress] = useState<string | null>(null);

  function clearFieldError(key: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }

  async function analyzeImage(selectedFile: File) {
    setStep("analyzing");
    setAiConfidence(null);
    setAiDetectedLabel(null);
    setAiCategory("");
    setAiSubcategory("");
    setReconstructionReason(null);
    setNeedsReconstruction(false);
    setSubcategoryAiRaw(null);
    // Paso al que se cae si Vision falla o no alcanza para dar la prenda por
    // identificada: el flujo manual completo, desde categorías.
    let nextStep: Step = "category";
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
        const {
          categoria,
          subcategoria,
          color_principal,
          color_hex,
          ocasiones,
          confianza,
          needs_reconstruction,
          reconstruction_reason,
        } = result.data;

        const validCategories: ClothingCategory[] = [
          "top", "bottom", "dress", "outerwear", "footwear", "accessory",
        ];
        let detectedCategory: ClothingCategory | "" = "";
        let detectedSubcategory = "";
        if (categoria && validCategories.includes(categoria as ClothingCategory)) {
          detectedCategory = categoria as ClothingCategory;
          setAiCategory(detectedCategory);
          const matchedSub = matchSubcategory(categoria, subcategoria ?? "");
          if (matchedSub) {
            detectedSubcategory = matchedSub;
            setAiSubcategory(matchedSub);
            setSubcategoryAiRaw(null);
          } else if (subcategoria?.trim()) {
            // Auditoría: Vision devolvió algo que no matchea la lista. La
            // prenda se guarda igual (el usuario elige a mano) pero queremos el
            // string crudo para poder ampliar los sinónimos con casos reales.
            setSubcategoryAiRaw(subcategoria.trim());
          }
        }

        if (color_principal || color_hex) {
          const matchedColor = matchColorToPalette(color_principal ?? "", color_hex ?? "");
          if (matchedColor) setColor(matchedColor);
        }

        const mappedOcasiones = mapAiOccasions(ocasiones ?? []);
        if (mappedOcasiones.length > 0) setOccasions(mappedOcasiones);

        setAiConfidence(confianza ?? "baja");
        setNeedsReconstruction(Boolean(needs_reconstruction));
        setReconstructionReason(needs_reconstruction ? reconstruction_reason : null);

        const parts = [subcategoria, color_principal].filter(Boolean);
        if (parts.length > 0) setAiDetectedLabel(parts.join(" · "));

        // Caso feliz: Vision está segura y logramos mapear la prenda a la
        // taxonomía. Se da por elegida y el usuario aterriza en el paso final,
        // donde igual puede corregirla con "Cambiar categoría".
        //
        // El color NO entra en la condición a propósito: si Vision identificó
        // bien la prenda pero no le atinó al color, mandar al usuario a
        // recorrer los grids de categoría es peor que dejarlo en el detalle
        // eligiendo solo el color (que es un campo visible ahí mismo, y
        // `validar()` lo exige antes de guardar).
        if (confianza === "alta" && detectedCategory && detectedSubcategory) {
          setCategory(detectedCategory);
          setSubcategory(detectedSubcategory);
          setDetailBackStep("category");
          nextStep = "detail";
        }
      }
    } catch {
      // Falla silenciosa — se cae al flujo manual desde `category`
    } finally {
      setStep(nextStep);
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
    setReconstructionReason(null);
    setNeedsReconstruction(false);
    setSubcategoryAiRaw(null);
    setEyedropperActive(false);
    setFieldErrors({});

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
    setStep("photo");
    setFile(null);
    setPreview(null);
    setEyedropperSrc(null);
    setAiConfidence(null);
    setAiDetectedLabel(null);
    setAiCategory("");
    setAiSubcategory("");
    setSubcategoryAiRaw(null);
    setEyedropperActive(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    clearFieldError("image");
  }

  function handleCategoria(cat: ClothingCategory) {
    // Cambiar de categoría invalida la subcategoría elegida: las listas no se
    // solapan entre categorías.
    if (cat !== category) setSubcategory("");
    setCategory(cat);
    clearFieldError("category");
    clearFieldError("subcategory");
    setStep("subcategory");
  }

  function handleSubcategoria(sub: string) {
    setDetailBackStep("subcategory");
    setSubcategory(sub);
    clearFieldError("subcategory");
    setStep("detail");
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
      errs.occasions = "Marca al menos una ocasión para esta prenda.";
    if (name.length > NAME_MAX_LENGTH)
      errs.name = `El nombre no puede pasar de ${NAME_MAX_LENGTH} caracteres.`;
    return errs;
  }

  async function handleSubmit() {
    // Primera línea síncrona de la función: si ya hay un submit en vuelo,
    // se ignora este clic por completo (ver comentario en submittingRef).
    if (submittingRef.current) return;

    // Único punto de salida por error: deja el panel abierto en modo error
    // (con Reintentar/Cancelar) en vez de simplemente desaparecer — así el
    // usuario nunca se queda sin saber qué pasó ni cómo seguir.
    function fail(msg: string) {
      setGeneralError(msg);
      setSaveFailed(true);
    }

    setGeneralError(null);
    setSaveFailed(false);
    const errs = validar();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0 || !file || !category) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSaveDone(false);
    setProgress("Optimizando tu foto…");

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        fail("Tu sesión expiró. Vuelve a iniciar sesión.");
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
        fail("No pudimos procesar la imagen. Prueba con otra foto.");
        return;
      }

      if (comprimido.size > MAX_COMPRESSED_BYTES) {
        fail(
          `La imagen comprimida pesa ${bytesToReadable(comprimido.size)}. Prueba con una foto de menor resolución.`
        );
        return;
      }

      // Pipeline de imagen, en cascada de más a menos ambicioso:
      //
      //   1. Si Vision marcó la foto como necesitada de reconstrucción,
      //      subimos la cruda primero (para el toggle "Ver original") e
      //      intentamos reconstruirla con Gemini. Ese resultado YA viene con
      //      el fondo removido.
      //   2. Si la reconstrucción falla —o si nunca hizo falta— se intenta la
      //      remoción de fondo simple, que es una edición mínima y mucho más
      //      barata de acertar.
      //   3. Si TODO falla, se sube la foto comprimida original tal cual: la
      //      prenda nunca se pierde y queda reprocesable con "Mejora esta
      //      foto" desde el armario.
      //
      // El paso 2 como fallback del 1 es la corrección de un bug real: antes
      // las dos ramas eran EXCLUYENTES, así que una prenda marcada para
      // reconstrucción cuya reconstrucción fallaba caía directo al paso 3 y
      // terminaba en el armario con el fondo completo, sin haber intentado
      // siquiera la remoción simple. Cuesta un segundo crédito de Gemini,
      // pero solo en el camino de fallo.
      let rawPath: string | null = null;
      let reconstructed = false;
      // Dos cosas distintas que antes compartían variable:
      //   - `pipelineResuelto`: control de flujo. Ya tenemos imagen final, no
      //     hay que intentar la remoción de fondo.
      //   - `backgroundRemoved`: el DATO que se guarda. Dice si el recorte
      //     funcionó de verdad (lo mide finalizeGeminiImageOutput sobre el
      //     resultado). Mezclarlas hacía que un recorte fallido en la
      //     reconstrucción disparara una segunda llamada a Gemini sobre la
      //     foto ORIGINAL, tirando la reconstrucción a la basura.
      let pipelineResuelto = false;
      let backgroundRemoved = false;
      let toUpload: File = comprimido;
      // Motivo por el que el pipeline no pudo limpiar la foto, para el log.
      // null = salió bien.
      let imageFailure: string | null = null;
      // Desenlace de la foto, para decidir qué avisarle al usuario:
      //   ok      → quedó como se esperaba, nada que avisar.
      //   parcial → hacía falta reconstruir (persona/gancho en la foto) pero
      //             solo se pudo quitar el fondo: la prenda es usable, aunque
      //             la mano o el gancho siguen ahí.
      //   falla   → no se pudo hacer nada, quedó la foto original.
      let photoOutcome: "ok" | "parcial" | "falla" = "ok";

      // OJO: la condición es el booleano, NO el string del motivo. Antes era
      // `if (reconstructionReason)`, y si Vision devolvía
      // needs_reconstruction=true con reconstruction_reason vacío o null, la
      // reconstrucción se salteaba en silencio.
      if (needsReconstruction) {
        try {
          const rawUuid = crypto.randomUUID();
          const candidateRawPath = buildClothingImagePath({
            userId: user.id,
            fileName: comprimido.name,
            uuid: rawUuid,
          });
          const { error: rawUploadError } = await supabase.storage
            .from(CLOTHING_IMAGES_BUCKET)
            .upload(candidateRawPath, comprimido, {
              contentType: comprimido.type,
              upsert: false,
            });

          if (rawUploadError) {
            imageFailure = `no pudimos guardar la foto original (${rawUploadError.message})`;
          } else {
            rawPath = candidateRawPath;

            setProgress("Puliendo los detalles con IA…");
            const description = [subcategory, color].filter(Boolean).join(" ") || category || "prenda de ropa";
            const reconForm = new FormData();
            reconForm.append("image", comprimido, comprimido.name);
            reconForm.append("description", description);
            if (category) reconForm.append("category", category);
            reconForm.append("source", "individual");
            const reconResult = await reconstructGarmentImageAction(reconForm);

            if (reconResult.ok) {
              const reconBlob = base64ToBlob(reconResult.base64, reconResult.contentType);
              toUpload = new File([reconBlob], "photo.png", { type: reconResult.contentType });
              reconstructed = true;
              pipelineResuelto = true;
              backgroundRemoved = reconResult.backgroundRemoved;
            } else {
              imageFailure = describeImageFailure("reconstrucción", reconResult);
            }
          }
        } catch (err) {
          imageFailure = `reconstrucción: ${err instanceof Error ? err.message : "error desconocido"}`;
        }
      }

      // Remoción de fondo simple: la ruta normal cuando no hacía falta
      // reconstruir, y el fallback cuando la reconstrucción no salió.
      if (!pipelineResuelto) {
        setProgress("Quitando el fondo…");
        try {
          const fd = new FormData();
          fd.append("image", comprimido, comprimido.name);
          fd.append("source", "individual");
          const bgResult = await removeBackgroundWithGemini(fd);
          if (bgResult.ok) {
            const pngBlob = base64ToBlob(bgResult.base64, bgResult.contentType);
            toUpload = new File([pngBlob], "photo.png", { type: "image/png" });
            pipelineResuelto = true;
            backgroundRemoved = bgResult.backgroundRemoved;
            // Si la reconstrucción había fallado pero el fondo sí se pudo
            // quitar, el resultado es usable — pero NO es lo que se buscaba:
            // la mano/el gancho que motivaron la reconstrucción siguen en la
            // foto. Se avisa como parcial, no como éxito.
            photoOutcome = needsReconstruction ? "parcial" : "ok";
          } else {
            imageFailure = describeImageFailure("remoción de fondo", bgResult);
            photoOutcome = "falla";
          }
        } catch (err) {
          imageFailure = `remoción de fondo: ${err instanceof Error ? err.message : "error desconocido"}`;
          photoOutcome = "falla";
        }
      }

      // El recorte pudo no surtir efecto aunque la IA respondiera bien (fondo
      // que no era blanco y @imgly no lo resolvió). La prenda se guarda igual,
      // pero se avisa como parcial y `background_removed=false` hace que la
      // card ofrezca "Mejora esta foto" — antes esto quedaba invisible porque
      // el flag se ponía en true sin mirar el resultado.
      if (pipelineResuelto && !backgroundRemoved && photoOutcome === "ok") {
        photoOutcome = "parcial";
      }

      // El fallo NO puede ser silencioso: la prenda se guarda igual (nunca la
      // perdemos por esto), pero el usuario tiene que enterarse de que la foto
      // no quedó como debía y de que puede reintentarlo.
      if (imageFailure) {
        console.error(
          `[UploadForm] pipeline de imagen (${photoOutcome}):`,
          imageFailure
        );
      }

      setProgress("Subiendo tu prenda…");
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
          cacheControl: THUMBNAIL_CACHE_CONTROL,
        });

      if (uploadError) {
        fail(
          `No pudimos subir la imagen: ${uploadError.message}. Revisa tu conexión o vuelve a intentarlo.`
        );
        return;
      }

      // Miniatura para la grilla del armario. Adicional, nunca bloqueante: si
      // falla la generación o la subida, `thumbnailPath` queda null y la card
      // cae al PNG completo (más lento, pero se ve igual).
      const thumbnailPath = await subirMiniatura(supabase, toUpload, path);

      setProgress("Guardando en tu armario…");
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
          thumbnail_path: thumbnailPath,
          raw_image_path: rawPath,
          reconstructed,
          reconstruction_reason: reconstructionReason,
          background_removed: backgroundRemoved,
          subcategory_ai_raw: subcategoryAiRaw,
        });

      if (insertError) {
        const orphanPaths = [path, rawPath, thumbnailPath].filter(
          (p): p is string => Boolean(p)
        );
        await supabase.storage
          .from(CLOTHING_IMAGES_BUCKET)
          .remove(orphanPaths)
          .catch(() => {});
        fail(`No pudimos guardar la prenda: ${insertError.message}.`);
        return;
      }

      recordPetAction("garment_uploaded").catch(() => {});

      // Pausa breve de "¡Listo!" antes de navegar — puramente cosmética,
      // para que el cierre se sienta como un cierre exitoso y no como un
      // corte abrupto. IMPORTANTE: solo router.push, sin router.refresh()
      // — llamarlos juntos acá (fuera del flujo de auth, que es donde este
      // combo sí está probado) hacía que la transición de Next se colgara:
      // el fetch del RSC de destino se completaba en el servidor (confirmado
      // en logs) pero el navegador nunca conmutaba de ruta, dejando el panel
      // "congelado" en el último mensaje. router.push a una URL nueva ya
      // trae datos frescos por sí solo, no hace falta forzar un refresh.
      setProgress("¡Listo!");
      setSaveDone(true);
      await new Promise((resolve) => setTimeout(resolve, 700));
      // Si la foto no quedó como debía, el armario muestra un aviso en vez del
      // banner verde: la prenda se guardó, pero el usuario tiene que saberlo
      // para poder reintentar con "Mejora esta foto".
      router.push(
        photoOutcome === "ok"
          ? "/wardrobe?uploaded=1"
          : `/wardrobe?uploaded=1&fotoAviso=${photoOutcome}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      fail(`Algo salió mal: ${msg}.`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setProgress(null);
    }
  }

  function handleCancelSaveError() {
    setSaveFailed(false);
    setGeneralError(null);
  }

  function handleCameraClick() {
    if (userId && localStorage.getItem(`strandia_camera_tips_seen:${userId}`)) {
      cameraInputRef.current?.click();
    } else {
      setShowCameraTips(true);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // La foto va grande mientras no haya prenda elegida, y se reduce a
  // miniatura en los pasos siguientes para dejarle la pantalla al flujo. La
  // excepción es el gotero: leer un color de una miniatura de 64px es
  // imposible, así que mientras está activo la foto vuelve a tamaño completo.
  const showLargePhoto = step === "photo" || eyedropperActive;

  return (
    <div className="flex flex-col gap-6">
      {showCameraTips && userId ? (
        <CameraTipsModal
          storageKey={`strandia_camera_tips_seen:${userId}`}
          onConfirm={() => {
            setShowCameraTips(false);
            cameraInputRef.current?.click();
          }}
          onClose={() => setShowCameraTips(false)}
        />
      ) : null}

      {/* ── Foto ─────────────────────────────────────────────────────────── */}
      {!showLargePhoto ? (
        <div className="flex items-center gap-3">
          <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview ?? ""}
              alt="Vista previa de la prenda"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </span>
          <Button variant="ghost" onClick={handleCambiarFoto} disabled={submitting}>
            Cambiar foto
          </Button>
        </div>
      ) : (
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

            <button
              type="button"
              onClick={() => setShowCameraTips(true)}
              disabled={!userId}
              className="mx-auto mt-3 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-text-muted transition-colors duration-150 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-sm leading-none" aria-hidden="true">
                help
              </span>
              Tips para la foto
            </button>
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
      )}

      {/* Imagen oculta (max 800×800) que usa el eyedropper para leer el píxel.
          Va fuera del bloque de la foto a propósito: así ya está cargada
          cuando el usuario activa el gotero, sin depender de que la tarjeta
          grande se acabe de montar. */}
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

      {/* ── Análisis IA en curso ──────────────────────────────────────────── */}
      {step === "analyzing" ? (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary-light px-4 py-2.5 text-sm font-medium text-primary animate-pulse">
            <div
              className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-hidden="true"
            />
            Detectando prenda…
          </div>
        </div>
      ) : null}

      {/* ── Paso: categoría ──────────────────────────────────────────────── */}
      {step === "category" ? (
        <CategoryGrid
          selected={category}
          hinted={aiCategory}
          onSelect={handleCategoria}
        />
      ) : null}

      {/* ── Paso: subcategoría ───────────────────────────────────────────── */}
      {step === "subcategory" && category ? (
        <SubcategoryGrid
          category={category}
          selected={subcategory}
          // El hint solo aplica si el usuario está en la categoría que detectó
          // la IA: la subcategoría detectada no existe en las otras listas.
          hinted={category === aiCategory ? aiSubcategory : undefined}
          onSelect={handleSubcategoria}
          onBack={() => setStep("category")}
        />
      ) : null}

      {/* ── Paso: detalle ────────────────────────────────────────────────── */}
      {step === "detail" && category && subcategory ? (
        <>
          <GarmentDetailStep
            category={category}
            subcategory={subcategory}
            // El chip solo tiene sentido mientras la prenda mostrada SIGA
            // siendo la que detectó la IA: si el usuario la corrigió a mano,
            // seguir diciendo "Detectado por IA: Camiseta" arriba de un
            // "Blazer" es simplemente falso.
            aiDetectedLabel={
              aiConfidence === "alta" &&
              category === aiCategory &&
              subcategory === aiSubcategory
                ? aiDetectedLabel
                : null
            }
            color={color}
            onColorChange={(c) => {
              setColor(c);
              clearFieldError("color");
            }}
            onActivateEyedropper={handleActivateEyedropper}
            eyedropperActive={eyedropperActive}
            occasions={occasions}
            onToggleOccasion={(o) => {
              setOccasions((arr) => toggle(arr, o));
              clearFieldError("occasions");
            }}
            name={name}
            onNameChange={(v) => {
              setName(v);
              clearFieldError("name");
            }}
            onChangeCategory={() => setStep("category")}
            onBack={() => setStep(detailBackStep)}
            backLabel={
              detailBackStep === "subcategory"
                ? "Volver a subcategorías"
                : "Volver a categorías"
            }
            errors={fieldErrors}
          />

          {submitting || saveFailed ? (
            <SaveProgressPanel
              message={progress}
              done={saveDone}
              error={saveFailed ? generalError : null}
              onRetry={handleSubmit}
              onCancel={handleCancelSaveError}
            />
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
      {step === "photo" ? (
        <div className="flex justify-start">
          <Button variant="ghost" onClick={() => router.push("/wardrobe")}>
            Cancelar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ── Panel de progreso al guardar ──────────────────────────────────────────────
//
// El pipeline hace 1-2 llamadas a Gemini (5-15s cada una) antes de terminar,
// así que el usuario necesita ver en todo momento que algo está pasando — es
// justo lo que llevaba al doble-tap accidental. A diferencia de una barra
// falsa que avanza sola, el % acá SOLO se mueve cuando `handleSubmit`
// confirma que una etapa real terminó (ver SAVE_PROGRESS_STAGES): progreso
// honesto, no teatro.
function SaveProgressPanel({
  message,
  done,
  error,
  onRetry,
  onCancel,
}: {
  message: string | null;
  done: boolean;
  error: string | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-4 rounded-xl bg-danger-light px-5 py-6 motion-safe:animate-[fadeInUp_180ms_ease-out]"
      >
        <div className="flex items-center gap-3">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 text-danger"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          <p className="text-center font-display text-lg font-semibold text-danger">
            {error}
          </p>
        </div>
        <div className="flex w-full max-w-xs gap-3">
          <Button variant="ghost" size="md" fullWidth onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" fullWidth onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const pct = (message && SAVE_PROGRESS_STAGES[message]) || 8;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "flex flex-col items-center gap-4 rounded-xl px-5 py-6 motion-safe:animate-[fadeInUp_180ms_ease-out]",
        done ? "bg-success-light" : "bg-primary-light",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {done ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="shrink-0 text-success"
            aria-hidden="true"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        ) : (
          <div
            className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden="true"
          />
        )}
        <p
          key={message}
          className={[
            "font-display text-lg font-semibold transition-opacity duration-300 motion-safe:animate-[fadeInUp_180ms_ease-out]",
            done ? "text-success" : "text-primary",
          ].join(" ")}
        >
          {message ?? "Trabajando en tu prenda…"}
        </p>
      </div>
      <div className="w-full max-w-xs">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
          <div
            className={[
              "h-full origin-left rounded-full transition-transform duration-500 ease-out",
              done ? "bg-success" : "bg-primary",
            ].join(" ")}
            style={{ transform: `scaleX(${pct / 100})`, width: "100%" }}
          />
        </div>
      </div>
      <p
        className={[
          "text-center text-xs",
          done ? "text-success/70" : "text-primary/70",
        ].join(" ")}
      >
        {done ? "Ya quedó en tu armario." : "No cierres esta pantalla — ya casi queda lista."}
      </p>
    </div>
  );
}
