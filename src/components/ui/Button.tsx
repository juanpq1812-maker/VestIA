// Boton reutilizable de StrandIA.
//
// Variantes:
//   - primary: fondo violeta, para la accion principal de la pantalla.
//   - secondary: fondo violeta claro, para acciones de apoyo.
//   - ghost:    transparente con borde, para acciones terciarias o "atras".
//
// Tamanos: md (default) y lg (mas alto, mas espacio horizontal).
// `fullWidth` lo hace ocupar todo el ancho disponible.
// `isLoading` lo deshabilita y muestra un texto alternativo opcional.

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type Variant = "primary" | "secondary" | "ghost";
export type Size = "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-md hover:-translate-y-px active:translate-y-0 active:bg-primary-active",
  secondary:
    "bg-primary-light text-primary hover:bg-surface-offset",
  ghost:
    "bg-transparent text-text-muted border border-border hover:bg-surface-2 hover:text-text",
};

const sizeClasses: Record<Size, string> = {
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold " +
  "transition-all duration-200 ease-out " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Clases de botón para elementos que NO son `<button>`.
 *
 * Existe para los enlaces que deben verse como botón: `<Link><Button>` produce
 * `<a><button>`, que es HTML inválido (contenido interactivo anidado) y rompe
 * la navegación por teclado. En su lugar: `<Link className={buttonClasses()}>`.
 */
export function buttonClasses(opts?: {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
}): string {
  const { variant = "primary", size = "md", fullWidth = false, className } = opts ?? {};
  return [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? "w-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth = false,
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {leftIcon ? <span aria-hidden="true">{leftIcon}</span> : null}
      <span>{isLoading && loadingText ? loadingText : children}</span>
      {rightIcon ? <span aria-hidden="true">{rightIcon}</span> : null}
    </button>
  );
});

export default Button;
