// Bloque de consentimiento de la pantalla de registro.
//
// Dos casillas separadas, ambas obligatorias, a propósito:
//
//   - Aceptar los documentos es CONCEDER UN PERMISO.
//   - Declarar la mayoría de edad es AFIRMAR UN HECHO sobre uno mismo.
//
// Bundleadas en una sola casilla, un clic tiene que hacer doble trabajo: si
// más adelante se discute la edad (un menor se registra y reclama su acudiente),
// el usuario puede sostener con cara honesta que marcó para aceptar los
// términos y no reparó en la cláusula de edad. Separadas, el registro de
// legal_consents muestra que la afirmó como acto propio. Cuesta un toque más.
//
// El párrafo informativo va ARRIBA de las casillas porque su función es
// informar antes de que marquen — es lo que exige la Ley 1581 de 2012 para
// que el consentimiento sea previo, expreso e informado.

"use client";

import Link from "next/link";
import { useId } from "react";
import { MIN_AGE } from "@/lib/legal/constants";

type Props = {
  mayorDeEdad: boolean;
  aceptaDocumentos: boolean;
  onMayorDeEdadChange: (v: boolean) => void;
  onAceptaDocumentosChange: (v: boolean) => void;
  /** Se pinta cuando el usuario intenta continuar sin marcar. */
  error?: string | null;
};

const CHECKBOX_CLASS =
  "mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/15";

export default function ConsentCheckboxes({
  mayorDeEdad,
  aceptaDocumentos,
  onMayorDeEdadChange,
  onAceptaDocumentosChange,
  error,
}: Props) {
  const errorId = useId();

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-xs leading-relaxed text-text-muted">
        Al registrarte autorizas a Strand Inc. a recolectar y procesar tus
        datos básicos de identificación (nombre y correo), así como las
        fotografías de prendas que cargues. Esas imágenes se procesan mediante
        modelos de IA de Google Gemini y Anthropic, y los datos se alojan en
        infraestructura segura en los Estados Unidos (Supabase, Vercel).
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex items-start gap-2.5 text-sm text-text">
          <input
            type="checkbox"
            checked={mayorDeEdad}
            onChange={(e) => onMayorDeEdadChange(e.target.checked)}
            className={CHECKBOX_CLASS}
            aria-describedby={error ? errorId : undefined}
          />
          <span>Soy mayor de {MIN_AGE} años.</span>
        </label>

        <label className="flex items-start gap-2.5 text-sm text-text">
          <input
            type="checkbox"
            checked={aceptaDocumentos}
            onChange={(e) => onAceptaDocumentosChange(e.target.checked)}
            className={CHECKBOX_CLASS}
            aria-describedby={error ? errorId : undefined}
          />
          <span>
            He leído y acepto los{" "}
            <Link
              href="/terms"
              target="_blank"
              className="font-medium text-primary underline underline-offset-4"
            >
              Términos de Servicio
            </Link>{" "}
            y la{" "}
            <Link
              href="/privacy-policy"
              target="_blank"
              className="font-medium text-primary underline underline-offset-4"
            >
              Política de Privacidad
            </Link>
            .
          </span>
        </label>
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
