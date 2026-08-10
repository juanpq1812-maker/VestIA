// Constantes de los planes StrandIA. Unico lugar de donde deben leer tanto
// los gates (checkAndConsumeGeneration, checkAndConsumePhotoImprovement)
// como la UI (contador, paywall) — nunca hardcodear estos numeros en otro
// archivo.

/** Generaciones de outfits incluidas por mes en el plan free. Cada tap del
 * boton "Generar"/"Regenerar" cuenta 1, sin importar cuantos outfits
 * devuelva esa generacion. */
export const FREE_MONTHLY_GENERATIONS = 10;

/** Mejoras de foto ("Mejora esta foto") incluidas en el plan free. Contador
 * de por vida, no mensual. */
export const FREE_PHOTO_IMPROVEMENTS = 5;

export const PREMIUM_PRICE_MONTHLY_COP = 19_900;
export const PREMIUM_PRICE_YEARLY_COP = 199_000;
