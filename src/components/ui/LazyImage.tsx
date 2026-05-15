"use client";

import { useState } from "react";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "loading"> & {
  src: string;
  alt: string;
};

/**
 * Imagen lazy con fade-in suave al cargarse.
 * Placeholder: el color de fondo del contenedor padre (backgroundColor prop).
 */
export default function LazyImage({ src, alt, className, style, ...rest }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
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
