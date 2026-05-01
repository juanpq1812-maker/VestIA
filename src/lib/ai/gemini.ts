// Cliente del SDK de Google Gemini.
//
// IMPORTANTE: este archivo NO se debe importar desde Client Components. La API
// key (`GOOGLE_GEMINI_API_KEY`) es secreta y vive solo del lado del servidor.
// Si Next.js detecta que un Client Component lee esta variable, fallara el
// build — y aunque no fallara, expondria la key al navegador.
//
// Modelo: leemos `GEMINI_MODEL` del entorno (variable opcional). El default es
// `gemini-1.5-flash` porque es el modelo flash que esta GRATIS en el plan
// gratuito de AI Studio. `gemini-2.0-flash` y `gemini-2.5-flash` solo estan
// disponibles con facturacion activa, asi que tirar 429 con limit:0 si se
// intenta usar gratis. Para cambiar a otro modelo basta con setear
// `GEMINI_MODEL=...` en `.env.local` y reiniciar.

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

/** Modelo por defecto: el unico flash que esta GRATIS hoy. */
export const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

/**
 * Devuelve el nombre del modelo a usar. Si la variable `GEMINI_MODEL` esta
 * definida (y no esta vacia) la respeta; si no, cae al default gratis.
 */
export function getGeminiModelName(): string {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_GEMINI_MODEL;
}

/**
 * Lee la API key del entorno y lanza un error claro si falta. Centralizamos
 * la lectura para que `generateOutfits` no tenga que repetir la validacion.
 */
function getGeminiApiKey(): string {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error(
      "Falta GOOGLE_GEMINI_API_KEY. Pega tu API key en `.env.local` (mira `.env.local.example`) y reinicia el servidor."
    );
  }
  return key;
}

/**
 * Devuelve un modelo de Gemini configurado para responder en JSON. Lo
 * forzamos con `responseMimeType: "application/json"` para reducir las
 * veces que la IA mete texto extra alrededor.
 *
 * Cada llamada crea una nueva instancia: el SDK es ligero y asi evitamos
 * cachear conexiones que pueden quedarse "calientes" entre requests.
 */
export function getGeminiModel(): GenerativeModel {
  const client = new GoogleGenerativeAI(getGeminiApiKey());
  return client.getGenerativeModel({
    model: getGeminiModelName(),
    generationConfig: {
      // JSON mode: aun asi parseamos defensivamente, pero ayuda mucho.
      responseMimeType: "application/json",
      temperature: 0.85,
    },
  });
}
