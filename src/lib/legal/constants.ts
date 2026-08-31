// Constantes de la documentación legal — punto único de verdad.
//
// Las VERSIONES son parte del registro de consentimiento: cuando el usuario
// marca las casillas del registro guardamos qué versión aceptó (tabla
// legal_consents, migración 0036). Si cambias el texto de /terms o
// /privacy-policy de forma material, SUBE la versión correspondiente — si no,
// el registro dirá que aceptó algo que ya no dice lo mismo.
//
// El formato es la fecha ISO de la última revisión material. Es monótono, se
// lee sin diccionario y coincide con el `updatedAt` que se muestra en la
// página.

export const TERMS_VERSION = "2026-08-25";
export const PRIVACY_VERSION = "2026-08-25";

/** Texto humano de la fecha, para el encabezado de las páginas legales. */
export const LEGAL_UPDATED_AT = "25 de agosto de 2026";

/**
 * Autorización para el modo "outfit completo", que sube una foto del usuario
 * de cuerpo entero y la manda a Claude Vision. Tiene su propia versión porque
 * es un consentimiento aparte del registro: si cambias ese texto, súbela y a
 * todo el mundo se le vuelve a pedir.
 */
export const BODY_PHOTO_CONSENT_VERSION = "2026-08-27";

/**
 * Edad mínima para usar StrandIA: mayoría de edad legal en Colombia.
 * Antes eran 14 años (con autorización del representante legal entre 14 y
 * 18); se subió a 18 para no tener que gestionar consentimiento parental.
 */
export const MIN_AGE = 18;

// TODO(juan): cuando exista el buzón privacidad@strandia.fashion, cámbialo
// acá y sube las dos versiones de arriba. Mientras no exista, NO se publica:
// una dirección que rebota en una política de privacidad es peor que un
// Gmail, porque un revisor de tienda sí escribe a ese buzón.
export const LEGAL_CONTACT_EMAIL = "strandia.fashion@gmail.com";
export const LEGAL_RESPONSIBLE = "Strand Inc.";
