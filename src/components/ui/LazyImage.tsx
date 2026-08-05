"use client";

import { useState } from "react";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "loading"> & {
  src: string;
  alt: string;
  /**
   * Para las imágenes que caen sobre el pliegue. `loading="lazy"` en una imagen
   * que ya está a la vista retrasa justo la que el usuario está mirando: el
   * navegador la descubre tarde y la pone al final de la cola. Con `priority`
   * se carga de una y con prioridad alta.
   */
  priority?: boolean;
};

/**
 * Imagen lazy con fade-in suave al cargarse.
 * Placeholder: el color de fondo del contenedor padre (backgroundColor prop).
 */
export default function LazyImage({ src, alt, className, style, priority = false, ...rest }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      onLoad={() => setLoaded(true)}
      className={[
        "transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      {...rest}
    />
  );
}
