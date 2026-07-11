// Server Action de /profile/help: chatbot de soporte de StrandIA.
//
// El asistente responde preguntas sobre cómo usar la app, con un system
// prompt que contiene el conocimiento de producto. Comparte el rate limiter
// de IA del resto de la app (30 llamadas/hora por usuario) para que el chat
// no se pueda usar para agotar la cuota de la API.

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { callAnthropicChatApi, type ChatTurn } from "@/lib/ai/aiClient";
import { checkAndConsumeAiUse } from "@/lib/ai/usageGate";

// Límites defensivos: el historial y cada mensaje tienen tope para que el
// prompt no crezca sin control (y el costo tampoco).
const MAX_TURNS = 12;
const MAX_MESSAGE_CHARS = 1000;

const SYSTEM_PROMPT = `Eres el asistente de soporte de StrandIA, una app web de armario digital con IA. Respondes SIEMPRE en español, tratando al usuario de "tú", en tono cálido y breve (2-4 frases por respuesta, listas cortas si ayudan). Responde en texto plano: nada de markdown, asteriscos ni encabezados — tu respuesta se muestra tal cual en una burbuja de chat (los saltos de línea y guiones para listas sí se ven bien).

Conocimiento del producto:
- StrandIA permite digitalizar tu armario: subes fotos de tus prendas en "Armario" y la IA las analiza (categoría, color) automáticamente.
- En "AI Studio" (/outfits) la IA genera outfits combinando las prendas de tu armario, según tus estilos y ocasiones preferidos. Puedes guardar outfits y marcar los días que los usaste.
- Para el primer outfit se recomiendan al menos 6 prendas: 2 tops, 2 bottoms, 1 calzado y 1 accesorio.
- En "Inicio" está el dashboard con la recomendación de outfit del día, que tiene en cuenta el clima y tus eventos del calendario.
- Calendario: en Perfil → Calendario puedes conectar Google Calendar y/o Apple Calendar pegando la URL ICS (dirección secreta de Google o enlace público de iCloud). La IA sugiere un outfit para tus eventos del día.
- Preferencias de estilo: en Perfil → Configuración → "Estilo preferido" puedes editar tus estilos, ocasiones, tallas y medidas del onboarding.
- Plan Free: outfits con IA desde tu armario, recomendación del día y armario ilimitado. Existe un plan Premium (upgrade desde Perfil → Mi plan).
- Hay un límite de 30 operaciones de IA por hora por usuario (generación de outfits, análisis de fotos y este chat).
- Notificaciones y opciones de privacidad todavía no están disponibles ("Próximamente").

Reglas:
- Si no sabes algo o la pregunta es sobre un bug, cobros o la cuenta, di que escriba al equipo y no inventes detalles.
- No des consejos médicos, legales ni financieros. Si preguntan algo fuera de StrandIA o de moda/outfits, redirige amablemente al tema de la app.
- Nunca pidas contraseñas ni datos de pago.`;

export type SupportChatResult =
  | { ok: true; reply: string }
  | { ok: false; error: string };

export async function askSupportAction(
  history: ChatTurn[]
): Promise<SupportChatResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }

  // Saneamos el historial: solo roles válidos, strings recortados, y nos
  // quedamos con los últimos turnos. El último mensaje debe ser del usuario.
  const turns: ChatTurn[] = history
    .filter(
      (t) =>
        (t.role === "user" || t.role === "assistant") &&
        typeof t.content === "string" &&
        t.content.trim().length > 0
    )
    .map((t) => ({
      role: t.role,
      content: t.content.trim().slice(0, MAX_MESSAGE_CHARS),
    }))
    .slice(-MAX_TURNS);

  if (turns.length === 0 || turns[turns.length - 1].role !== "user") {
    return { ok: false, error: "Escribe tu pregunta primero." };
  }

  const rate = await checkAndConsumeAiUse(user.id, supabase);
  if (!rate.allowed) {
    return {
      ok: false,
      error: `Alcanzaste el límite de IA por ahora. Intenta de nuevo en ${rate.resetInMinutes} min.`,
    };
  }

  try {
    const reply = await callAnthropicChatApi({
      systemPrompt: SYSTEM_PROMPT,
      messages: turns,
      maxTokens: 512,
    });
    if (!reply.trim()) {
      return { ok: false, error: "No pudimos generar una respuesta. Intenta de nuevo." };
    }
    return { ok: true, reply: reply.trim() };
  } catch (err) {
    console.error("[askSupportAction] error llamando al modelo", err);
    return {
      ok: false,
      error: "El asistente no está disponible en este momento. Intenta de nuevo en unos minutos.",
    };
  }
}
