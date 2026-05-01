// Card: contenedor con fondo blanco, borde sutil y sombra.
// Lo usamos para agrupar contenido relacionado (formularios, secciones,
// estadisticas). El padding es ajustable via la prop `padding`.

import type { HTMLAttributes, ReactNode } from "react";

type Padding = "sm" | "md" | "lg";

type Props = HTMLAttributes<HTMLDivElement> & {
  padding?: Padding;
  children: ReactNode;
};

const paddingClasses: Record<Padding, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8 md:p-10",
};

export default function Card({
  padding = "md",
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={[
        "rounded-xl border border-border bg-surface shadow-sm",
        "transition-shadow duration-200 hover:shadow-md",
        paddingClasses[padding],
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
