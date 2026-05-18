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

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

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
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold " +
    "transition-all duration-200 ease-out " +
    "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={[
        base,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {leftIcon ? <span aria-hidden="true">{leftIcon}</span> : null}
      <span>{isLoading && loadingText ? loadingText : children}</span>
      {rightIcon ? <span aria-hidden="true">{rightIcon}</span> : null}
    </button>
  );
});

export default Button;
