// Input reutilizable con label y manejo de error.
//
// Genera un id automatico si no le pasas uno, asi siempre el <label> queda
// asociado al <input> (importante para accesibilidad).
// Si pasas `error`, el borde se vuelve rojo y se muestra el mensaje debajo
// con role="alert" para que los lectores de pantalla lo anuncien.

import { forwardRef, useId, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
};

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, id, className, ...rest },
  ref
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const tieneError = Boolean(error);

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-sm font-semibold text-text"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={tieneError || undefined}
        aria-describedby={describedBy}
        className={[
          "w-full rounded-md border bg-surface px-4 py-3 text-base text-text",
          "placeholder:text-text-faint",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-4",
          tieneError
            ? "border-danger focus:border-danger focus:ring-danger/15"
            : "border-border focus:border-primary focus:ring-primary/15",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
