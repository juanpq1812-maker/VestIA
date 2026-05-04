// Cliente de IA para VestIA, apuntando a OpenRouter.
//
// OpenRouter expone una API compatible con el formato de OpenAI, asi que
// usamos el SDK oficial `openai` cambiandole el `baseURL`. Eso nos permite
// reusar la misma forma `chat.completions.create({...})` que ya conocemos.
//
// IMPORTANTE: este archivo NO se debe importar desde Client Components. La API
// key (`OPENROUTER_API_KEY`) es secreta y vive solo del lado del servidor. Si
// Next.js detecta que un Client Component lee esta variable, fallara el build
// — y aunque no fallara, expondria la key al navegador.
//
// Modelo: leemos `AI_MODEL` del entorno (variable opcional). El default es
// `meta-llama/llama-3.3-70b-instruct:free`, que es uno de los modelos abiertos
// que OpenRouter ofrece GRATIS hoy. Para cambiar a otro modelo basta con
// setear `AI_MODEL=...` en `.env.local` y reiniciar.
//
// OJO: en OpenRouter el sufijo `:free` es OBLIGATORIO para que el modelo no
// cobre. Cualquier modelo sin `:free` (ej. `meta-llama/llama-3.3-70b-instruct`
// a secas) se factura por token.

import OpenAI from "openai";

/** Modelo por defecto: gratis en OpenRouter gracias al sufijo `:free`. */
export const DEFAULT_AI_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

/** Base URL de la API de OpenRouter (compatible con el SDK de OpenAI). */
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Devuelve el nombre del modelo a usar. Si la variable `AI_MODEL` esta
 * definida (y no esta vacia) la respeta; si no, cae al default gratis.
 */
export function getAiModelName(): string {
  const fromEnv = process.env.AI_MODEL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_AI_MODEL;
}

/**
 * Lee la API key del entorno y lanza un error claro si falta. Centralizamos
 * la lectura para que `generateOutfits` no tenga que repetir la validacion.
 */
function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error(
      "Falta OPENROUTER_API_KEY. Pega tu API key en `.env.local` (mira `.env.local.example`) y reinicia el servidor."
    );
  }
  return key;
}

/**
 * Devuelve un cliente de OpenAI configurado contra OpenRouter. Los headers
 * `HTTP-Referer` y `X-Title` son opcionales pero recomendados por OpenRouter
 * para que tu trafico aparezca atribuido a tu app en el dashboard.
 */
export function getAiClient(): OpenAI {
  return new OpenAI({
    apiKey: getOpenRouterApiKey(),
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://vestia.app",
      "X-Title": "VestIA",
    },
  });
}
