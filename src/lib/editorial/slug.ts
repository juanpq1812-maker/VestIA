// Generación de slug para editorial_posts.slug (único, usado en /hilo/[slug]).

// Rango Unicode de diacríticos combinantes (tildes, diéresis, etc.) que quedan
// sueltos tras normalizar con NFD — así "café" -> "cafe" sin perder otros
// caracteres no-ASCII intencionales.
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Slug base + sufijo corto para desempatar colisiones (el caller reintenta si aun así choca). */
export function slugWithSuffix(title: string, suffix: string): string {
  const base = slugify(title) || "post";
  return `${base}-${suffix}`;
}
