// Container: wrapper centrado con ancho maximo y padding horizontal
// consistente en todas las pantallas. Tiene tres tamanos:
//   - sm: para formularios (login, register).
//   - md: para landing/contenido medio.
//   - lg: para vistas amplias como el armario.

import type { HTMLAttributes, ReactNode } from "react";

type Size = "sm" | "md" | "lg";

type Props = HTMLAttributes<HTMLDivElement> & {
  size?: Size;
  children: ReactNode;
};

const sizeClasses: Record<Size, string> = {
  sm: "max-w-md",
  md: "max-w-3xl",
  lg: "max-w-6xl",
};

export default function Container({
  size = "md",
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={[
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        sizeClasses[size],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
