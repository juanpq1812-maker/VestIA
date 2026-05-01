// Cliente del SDK de Google Gemini.
//
// IMPORTANTE: este archivo NO se debe importar desde Client Components. La API
// key (`GOOGLE_GEMINI_API_KEY`) es secreta y vive solo del lado del servidor.
// Si Next.js detecta que un Client Component lee esta variable, fallara el
// build — y aunque no fallara, expondria la key al navegador.
//
// Modelo elegido: `gemini-2.0-flash`. Es el modelo "rapido y barato" mas
// reciente de Gemini con buena calidad para tareas de razonamiento corto
// como combinar prendas. Si en el futuro cambia el nombre o sale un modelo
// mejor, basta con cambiar `GEMINI_MODEL_NAME` aqui.

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

// Si Google saca un nuevo flash o lo renombra (ej: gemini-2.5-flash), cambia
// solo esta constante.
export const GEMINI_MODEL_NAME = "gemini-2.0-flash";

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
    model: GEMINI_MODEL_NAME,
    generationConfig: {
      // JSON mode: aun asi parseamos defensivamente, pero ayuda mucho.
      responseMimeType: "application/json",
      temperature: 0.85,
    },
  });
}
