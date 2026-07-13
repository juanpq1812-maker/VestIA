// Server Actions de /outfits.
//
// Exponemos dos acciones a los Client Components:
//   - generateOutfitsAction: corre la IA (OpenRouter) y devuelve los outfits hidratados.
//   - saveOutfitAction: inserta el outfit elegido en la tabla `outfits`.
//
// Ambas validan la sesion y traducen los errores conocidos a mensajes en
// espanol que la UI puede mostrar tal cual.

"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import {
  generateOutfits,
  GenerateOutfitsError,
  type GeneratedOutfit,
  type GenerateMode,
} from "@/lib/ai/generateOutfits";
import { callAnthropicVisionApi } from "@/lib/ai/aiClient";
import { recordPetAction } from "@/lib/pet/actions";
import { checkAndConsumeAiUse } from "@/lib/ai/usageGate";
import { suggestOutfitForEvent } from "@/lib/ai/eventOutfit";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
export type GenerateActionInput = {
  mode: GenerateMode;
  occasion?: string;
  description?: string;
  /** ID de la prenda que la IA debe incluir obligatoriamente en todos los outfits. */
  lockedItemId?: string;
};

export type GenerateActionResult =
  | { ok: true; outfits: GeneratedOutfit[] }
  | { ok: false; error: string; code: string };

export async function generateOutfitsAction(
  input: GenerateActionInput
): Promise<GenerateActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      error: "Inicia sesion para generar outfits.",
    };
  }

  const limit = await checkAndConsumeAiUse(user.id, supabase);
  if (!limit.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      error: `Alcanzaste el límite de 30 consultas por hora. Puedes intentar de nuevo en ${limit.resetInMinutes} minuto${limit.resetInMinutes === 1 ? "" : "s"}.`,
    };
  }

  try {
    const outfits = await generateOutfits({
      userId: user.id,
      mode: input.mode,
      occasion: input.occasion,
      description: input.description,
      lockedItemId: input.lockedItemId,
    });
    // Corre tras enviar la respuesta — Hebri es gamificación, no debe sumar
    // latencia ni poder tumbar la generación real de outfits.
    after(() => recordPetAction("outfit_generated").catch(() => {}));
    return { ok: true, outfits };
  } catch (err) {
    if (err instanceof GenerateOutfitsError) {
      return { ok: false, code: err.code, error: err.message };
    }
    console.error("[generateOutfitsAction] error inesperado", err);
    return {
      ok: false,
      code: "UNKNOWN",
      error:
        "Algo salio mal generando el outfit. Intenta de nuevo en unos segundos.",
    };
  }
}

// ── Outfit por evento del calendario (dashboard) ─────────────────────────────

export type EventOutfitActionResult =
  | {
      ok: true;
      suggestion: {
        name: string;
        explanation: string;
        matchPercentage: number | null;
        occasion: string;
        items: Array<{
          id: string;
          nombre: string;
          image_url: string | null;
          primary_color: string | null;
        }>;
      };
    }
  | { ok: false; error: string; code: string };

/**
 * Genera la sugerencia de outfit para un evento (con caché por evento).
 * Solo consume rate limit cuando NO hay caché.
 */
export async function generateEventOutfitAction(
  eventId: string
): Promise<EventOutfitActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "UNAUTHENTICATED", error: "Inicia sesion para generar outfits." };
  }

  // El evento debe ser del usuario (RLS ya lo garantiza; el filtro es explícito).
  const { data: event } = await supabase
    .from("calendar_events")
    .select("id, title, starts_at, location")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!event) {
    return { ok: false, code: "NOT_FOUND", error: "Ese evento ya no está en tu calendario." };
  }

  // ¿Caché del día? Devolver sin gastar IA.
  const { data: cached } = await supabase
    .from("event_outfit_suggestions")
    .select("name, explanation, match_percentage, occasion_inferred, clothing_item_ids")
    .eq("event_id", eventId)
    .maybeSingle();

  let name: string, explanation: string, occasion: string;
  let matchPercentage: number | null;
  let itemIds: string[];

  if (cached) {
    ({ name, explanation } = cached);
    matchPercentage = cached.match_percentage;
    occasion = cached.occasion_inferred;
    itemIds = cached.clothing_item_ids ?? [];
  } else {
    const limit = await checkAndConsumeAiUse(user.id, supabase);
    if (!limit.allowed) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        error: `Alcanzaste el límite de consultas de IA. Intenta en ${limit.resetInMinutes} minuto${limit.resetInMinutes === 1 ? "" : "s"}.`,
      };
    }
    const res = await suggestOutfitForEvent(supabase, user.id, event);
    if (!res.ok) {
      return { ok: false, code: "GENERATION_FAILED", error: res.error };
    }
    name = res.suggestion.name;
    explanation = res.suggestion.explanation;
    matchPercentage = res.suggestion.match_percentage;
    occasion = res.suggestion.occasion_inferred;
    itemIds = res.suggestion.clothing_item_ids;
  }

  // Hidratar prendas con URLs firmadas para el dashboard.
  const items: Array<{
    id: string;
    nombre: string;
    image_url: string | null;
    primary_color: string | null;
  }> = [];
  if (itemIds.length > 0) {
    const { data: itemsRaw } = await supabase
      .from("clothing_items")
      .select("id, name, subcategory, category, primary_color, image_path")
      .in("id", itemIds);
    const paths = (itemsRaw ?? [])
      .map((i) => i.image_path)
      .filter((p): p is string => Boolean(p));
    const signed = await createSignedUrlMap(supabase, paths);
    for (const id of itemIds) {
      const it = (itemsRaw ?? []).find((i) => i.id === id);
      if (!it) continue;
      items.push({
        id: it.id,
        nombre: it.name?.trim() || it.subcategory?.trim() || it.category,
        image_url: it.image_path ? signed.get(it.image_path) ?? null : null,
        primary_color: it.primary_color,
      });
    }
  }

  return {
    ok: true,
    suggestion: { name, explanation, matchPercentage, occasion, items },
  };
}

export type SaveOutfitInput = {
  name: string;
  occasion: string | null;
  notes: string | null;
  clothing_item_ids: string[];
};

export type SaveOutfitResult =
  | { ok: true; outfitId: string }
  | { ok: false; error: string };

export async function saveOutfitAction(
  input: SaveOutfitInput
): Promise<SaveOutfitResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Inicia sesion para guardar outfits." };
  }

  if (!Array.isArray(input.clothing_item_ids) || input.clothing_item_ids.length < 2) {
    return {
      ok: false,
      error: "El outfit debe tener al menos 2 prendas.",
    };
  }

  // Verificamos que todos los IDs pertenecen al usuario (RLS lo hace tambien,
  // pero un check explicito da un error mas claro).
  const { data: ownedItems, error: ownedErr } = await supabase
    .from("clothing_items")
    .select("id")
    .eq("user_id", user.id)
    .in("id", input.clothing_item_ids);

  if (ownedErr) {
    console.error("[saveOutfitAction] error verificando prendas", ownedErr);
    return { ok: false, error: "No pudimos verificar tus prendas. Intenta de nuevo." };
  }
  if (!ownedItems || ownedItems.length !== input.clothing_item_ids.length) {
    return {
      ok: false,
      error: "Alguna de las prendas ya no existe en tu armario.",
    };
  }

  const { data, error } = await supabase
    .from("outfits")
    .insert({
      user_id: user.id,
      name: input.name.slice(0, 80),
      occasion: input.occasion,
      clothing_item_ids: input.clothing_item_ids,
      ai_generated: true,
      notes: input.notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[saveOutfitAction] insert fallo", error);
    return {
      ok: false,
      error: "No pudimos guardar el outfit. Intenta de nuevo.",
    };
  }

  // /outfits/saved depende de esta tabla, asi que invalidamos su cache.
  revalidatePath("/outfits/saved");

  return { ok: true, outfitId: data.id };
}

export type DeleteOutfitResult = { ok: true } | { ok: false; error: string };

export async function deleteOutfitAction(
  outfitId: string
): Promise<DeleteOutfitResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "No autenticado." };

  const { error } = await supabase
    .from("outfits")
    .delete()
    .eq("id", outfitId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[deleteOutfitAction] error", error);
    return { ok: false, error: "No pudimos eliminar el outfit." };
  }

  revalidatePath("/outfits/saved");
  return { ok: true };
}

// =============================================================================
// USOS DE OUTFITS (tabla `outfit_uses`)
// =============================================================================
//
// El usuario marca "Lo use hoy" o "Lo use otro dia" desde la UI. Servidor
// valida:
//   - Sesion activa.
//   - Outfit pertenece al usuario.
//   - daysAgo entre 0 (hoy) y 7 (hace 7 dias). Nunca futuro.
//   - UNIQUE (outfit_id, used_date) — el error 23505 (Postgres) lo traducimos
//     a "ya registrado".
//
// La fecha real (`used_date`) la calcula el servidor a partir de `daysAgo`,
// asi el cliente nunca puede inyectar fechas arbitrarias.

const MAX_DAYS_BACK = 7;

/** Devuelve "YYYY-MM-DD" para la fecha de hoy menos `daysAgo` dias. */
function dateNDaysAgoIso(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type RegisterUseInput = {
  outfitId: string;
  /** 0 = hoy, 1 = ayer, ... hasta 7. */
  daysAgo: number;
};

export type RegisterUseResult =
  | { ok: true; usedDate: string; useId: string }
  | { ok: false; code: RegisterUseErrorCode; error: string };

export type RegisterUseErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_OWNER"
  | "OUT_OF_RANGE"
  | "ALREADY_REGISTERED"
  | "UNKNOWN";

export async function registerOutfitUseAction(
  input: RegisterUseInput
): Promise<RegisterUseResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      error: "Inicia sesion para registrar usos.",
    };
  }

  // Validacion de rango: hoy (0) o hasta 7 dias atras. Nunca futuro.
  if (
    !Number.isInteger(input.daysAgo) ||
    input.daysAgo < 0 ||
    input.daysAgo > MAX_DAYS_BACK
  ) {
    return {
      ok: false,
      code: "OUT_OF_RANGE",
      error: `Solo puedes registrar usos de hoy o hasta hace ${MAX_DAYS_BACK} dias.`,
    };
  }

  // Verificacion explicita de propiedad (RLS tambien lo asegura, pero asi
  // damos un mensaje mas claro).
  const { data: outfit, error: outfitErr } = await supabase
    .from("outfits")
    .select("id, user_id")
    .eq("id", input.outfitId)
    .maybeSingle();

  if (outfitErr) {
    console.error("[registerOutfitUseAction] error consultando outfit", outfitErr);
    return { ok: false, code: "UNKNOWN", error: "No pudimos verificar el outfit." };
  }
  if (!outfit || outfit.user_id !== user.id) {
    return {
      ok: false,
      code: "NOT_OWNER",
      error: "Este outfit no esta en tus guardados.",
    };
  }

  const usedDate = dateNDaysAgoIso(input.daysAgo);

  const { data, error } = await supabase
    .from("outfit_uses")
    .insert({
      user_id: user.id,
      outfit_id: input.outfitId,
      used_date: usedDate,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation en Postgres.
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return {
        ok: false,
        code: "ALREADY_REGISTERED",
        error: "Ya registraste este outfit en esa fecha.",
      };
    }
    console.error("[registerOutfitUseAction] insert fallo", error);
    return {
      ok: false,
      code: "UNKNOWN",
      error: "No pudimos registrar el uso. Intenta de nuevo.",
    };
  }

  revalidatePath("/outfits/saved");
  revalidatePath("/outfits");

  return { ok: true, usedDate, useId: data.id };
}

/**
 * Guarda un outfit recien generado Y registra su uso para hoy en una sola
 * accion. Si la primera parte falla, no intentamos la segunda. Si la segunda
 * falla pero la primera ya quedo, devolvemos el id del outfit con un warning
 * legible.
 */
export type SaveAndUseResult =
  | { ok: true; outfitId: string; useId: string; usedDate: string }
  | {
      ok: "partial";
      outfitId: string;
      error: string;
    }
  | { ok: false; error: string };

export async function saveAndUseOutfitTodayAction(
  input: SaveOutfitInput
): Promise<SaveAndUseResult> {
  const saved = await saveOutfitAction(input);
  if (!saved.ok) return { ok: false, error: saved.error };

  const used = await registerOutfitUseAction({
    outfitId: saved.outfitId,
    daysAgo: 0,
  });

  if (!used.ok) {
    return {
      ok: "partial",
      outfitId: saved.outfitId,
      error: used.error,
    };
  }

  return {
    ok: true,
    outfitId: saved.outfitId,
    useId: used.useId,
    usedDate: used.usedDate,
  };
}

// =============================================================================
// ANÁLISIS DE FOTO DE INSPIRACIÓN (Feature 2)
// =============================================================================

export type DetectedGarment = {
  tipo: string;
  descripcion: string;
  categoria: "top" | "bottom" | "dress" | "outerwear" | "footwear" | "accessory";
  genero: "hombre" | "mujer" | "unisex";
};

export type AnalyzeInspirationResult =
  | { ok: true; prendas: DetectedGarment[]; estilo_general: string; estilo: string }
  | { ok: false; error: string; code?: string };

const ESTILOS_VALIDOS = [
  "streetwear",
  "casual",
  "formal",
  "femenino",
  "deportivo",
] as const;
type EstiloKey = (typeof ESTILOS_VALIDOS)[number];

const INSPIRATION_SYSTEM_PROMPT =
  "Eres el asistente de moda de StrandIA. Analizas fotos de outfits. Responde SOLO en JSON válido, sin texto adicional ni backticks. Usa español colombiano.";

export async function analyzeInspirationPhotoAction(input: {
  imageBase64: string;
  mimeType: string;
}): Promise<AnalyzeInspirationResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Inicia sesión para usar esta función." };
  }

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowed.includes(input.mimeType)) {
    return {
      ok: false,
      error: "Formato de imagen no soportado. Usa JPEG, PNG o WebP.",
    };
  }

  const limit = await checkAndConsumeAiUse(user.id, supabase);
  if (!limit.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      error: `Alcanzaste el límite de 30 consultas por hora. Puedes intentar de nuevo en ${limit.resetInMinutes} minuto${limit.resetInMinutes === 1 ? "" : "s"}.`,
    };
  }

  const userPrompt = `Analiza esta foto de outfit/look y lista las prendas que ves.
Además, clasifica el estilo general del outfit en UNO de estos valores exactos:
"streetwear", "casual", "formal", "femenino", "deportivo"

Responde en JSON con esta estructura exacta:
{
  "prendas": [
    {
      "tipo": "nombre de la prenda en español",
      "descripcion": "descripción breve del estilo/color",
      "categoria": "top|bottom|dress|outerwear|footwear|accessory",
      "genero": "hombre|mujer|unisex"
    }
  ],
  "estilo_general": "descripción libre del estilo general del outfit",
  "estilo": "streetwear|casual|formal|femenino|deportivo"
}
Solo responde JSON, sin texto adicional.`;

  try {
    const raw = await callAnthropicVisionApi({
      systemPrompt: INSPIRATION_SYSTEM_PROMPT,
      userText: userPrompt,
      imageBase64: input.imageBase64,
      imageMimeType: input.mimeType,
      maxTokens: 1024,
    });

    let jsonText = raw.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) jsonText = fenceMatch[1].trim();

    const firstBrace = jsonText.indexOf("{");
    const lastBrace = jsonText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonText = jsonText.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonText) as {
      prendas: DetectedGarment[];
      estilo_general: string;
      estilo?: unknown;
    };

    if (!Array.isArray(parsed.prendas) || parsed.prendas.length === 0) {
      return {
        ok: false,
        error:
          "No pudimos identificar prendas en la imagen. Intenta con otra foto.",
      };
    }

    const estiloRaw =
      typeof parsed.estilo === "string"
        ? parsed.estilo.toLowerCase().trim()
        : "";
    const estilo: string = ESTILOS_VALIDOS.includes(estiloRaw as EstiloKey)
      ? estiloRaw
      : "casual";

    return {
      ok: true,
      prendas: parsed.prendas.slice(0, 8),
      estilo_general:
        typeof parsed.estilo_general === "string" ? parsed.estilo_general : "",
      estilo,
    };
  } catch (err) {
    const httpErr = err as Error & { status?: number };
    if (httpErr.status === 401) {
      return {
        ok: false,
        error: "Error de configuración de IA. Contacta al soporte.",
      };
    }
    if (httpErr.status === 429) {
      return {
        ok: false,
        error:
          "Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.",
      };
    }
    console.error("[analyzeInspirationPhotoAction] error", err);
    return { ok: false, error: "No pudimos analizar la foto. Intenta de nuevo." };
  }
}
