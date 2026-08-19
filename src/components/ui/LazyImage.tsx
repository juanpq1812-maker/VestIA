"use client";

import { useCallback, useState } from "react";

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

  // El fade arranca en opacity-0 y sube con `onLoad`. Pero si la imagen ya
  // estaba en caché, el navegador puede terminarla ANTES de que React monte el
  // handler: entonces `onLoad` no dispara nunca y la imagen se queda invisible
  // para siempre. Pasaba desde siempre; con el fondo de color detrás no se
  // notaba —se veía un bloque del color de la prenda— pero sobre la lámina
  // blanca queda una tarjeta vacía.
  //
  // La comprobación va en un ref callback y no en un efecto: corre en el commit,
  // antes del paint (así no hay parpadeo), y no dispara la regla de lint que
  // prohíbe setState síncrono dentro de useEffect.
  const revelarSiYaEstaba = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <img
      ref={revelarSiYaEstaba}
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
