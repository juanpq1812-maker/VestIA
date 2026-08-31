// Autorización de foto de cuerpo entero — casilla + detalle desplegable.
//
// Vive en DOS sitios y por eso es un componente aparte: el paso del onboarding
// (donde se pide de entrada) y el modal just-in-time de OutfitPhotoCapture
// (respaldo para quien saltó el paso o para las cuentas anteriores a este
// cambio). Un solo componente garantiza que el texto que se acepta sea
// literalmente el mismo en ambos.
//
// COLAPSADO A PROPÓSITO. La casilla lleva una línea corta y legible de un
// vistazo; el texto legal completo va detrás de "Ver detalles". Un párrafo
// jurídico de seis líneas al lado de una casilla no se lee — se marca. La
// línea corta describe con fidelidad lo que se autoriza, y el detalle está a
// un toque, sin salir de la pantalla.
//
// OJO CON LO QUE SE GUARDA. En legal_consents se registra
// BODY_PHOTO_CONSENT_VERSION, que identifica el TEXTO COMPLETO de abajo, no la
// línea corta. Si cambias el texto completo, sube la versión: es lo que hace
// que la constancia siga significando lo que dice.

"use client";

import { BODY_PHOTO_CONSENT_VERSION } from "@/lib/legal/constants";

/**
 * Texto legal completo. Es el contenido que ampara
 * `BODY_PHOTO_CONSENT_VERSION` ({@link BODY_PHOTO_CONSENT_VERSION}).
 */
export const BODY_PHOTO_CONSENT_FULL_TEXT =
  "Autorizo expresamente a Strand Inc. a tratar mis fotografías de outfit " +
  "completo (cuerpo entero) —reconocidas como dato sensible— y a transferirlas " +
  "temporalmente a Anthropic y Google en los Estados Unidos, con la única " +
  "finalidad de detectar automáticamente las prendas y darme recomendaciones " +
  "de estilismo. Puedo revocar esta autorización o eliminar las fotos en " +
  "cualquier momento desde la app.";

export const BODY_PHOTO_CONSENT_SHORT_TEXT =
  "Autorizo el uso de mis fotos de cuerpo entero para detectar prendas.";

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

export default function BodyPhotoConsentFields({
  checked,
  onChange,
  disabled = false,
}: Props) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <label className="flex items-start gap-2.5 text-sm text-text">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/15 disabled:opacity-60"
        />
        <span className="leading-relaxed">{BODY_PHOTO_CONSENT_SHORT_TEXT}</span>
      </label>

      {/* <details> nativo: accesible y sin JS, mismo patrón que el "¿Dónde
          encuentro esta URL?" de CalendarFeedForm. */}
      <details className="mt-2 pl-[26px]">
        <summary className="cursor-pointer text-xs font-semibold text-primary hover:underline">
          Ver detalles
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          {BODY_PHOTO_CONSENT_FULL_TEXT}
        </p>
        <p className="mt-2 text-[11px] text-text-faint">
          Versión {BODY_PHOTO_CONSENT_VERSION}. Guardamos constancia de la fecha
          y la versión que aceptaste.
        </p>
      </details>
    </div>
  );
}
