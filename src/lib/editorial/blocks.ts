// Bloques de contenido de un post editorial ("El Hilo").
//
// `editorial_posts.content` es un array JSON de bloques tipados. No hay zod
// en el proyecto — validamos a mano con type guards estrictos, mismo enfoque
// que src/lib/wardrobe/outfitDetectionSchema.ts. Se valida tanto al leer
// (por si el JSON en DB quedara corrupto) como al guardar desde el editor
// admin (para no persistir un bloque malformado).

export type ParagraphBlock = { type: "paragraph"; text: string };
export type HeadingBlock = { type: "heading"; text: string };
export type ImageBlock = { type: "image"; path: string; caption?: string };
export type QuoteBlock = { type: "quote"; text: string; attribution?: string };

export type EditorialBlock = ParagraphBlock | HeadingBlock | ImageBlock | QuoteBlock;

const BLOCK_TYPES = ["paragraph", "heading", "image", "quote"] as const;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isOptionalString(v: unknown): v is string | undefined {
  return v === undefined || typeof v === "string";
}

function isValidBlock(v: unknown): v is EditorialBlock {
  if (!v || typeof v !== "object") return false;
  const b = v as Record<string, unknown>;
  if (typeof b.type !== "string" || !BLOCK_TYPES.includes(b.type as (typeof BLOCK_TYPES)[number])) {
    return false;
  }

  switch (b.type) {
    case "paragraph":
    case "heading":
      return isNonEmptyString(b.text);
    case "image":
      return isNonEmptyString(b.path) && isOptionalString(b.caption);
    case "quote":
      return isNonEmptyString(b.text) && isOptionalString(b.attribution);
    default:
      return false;
  }
}

/** Valida un array crudo (de DB o de un form) y descarta bloques malformados. */
export function parseEditorialBlocks(raw: unknown): EditorialBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidBlock);
}

/** Igual que parseEditorialBlocks pero falla en vez de descartar — usar al guardar
 *  desde el editor admin, donde un bloque malformado es un bug del form, no un
 *  dato externo no confiable. */
export function validateEditorialBlocksStrict(raw: unknown): EditorialBlock[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return [];
  return raw.every(isValidBlock) ? (raw as EditorialBlock[]) : null;
}

export function emptyBlockOfType(type: EditorialBlock["type"]): EditorialBlock {
  switch (type) {
    case "paragraph":
      return { type: "paragraph", text: "" };
    case "heading":
      return { type: "heading", text: "" };
    case "image":
      return { type: "image", path: "", caption: "" };
    case "quote":
      return { type: "quote", text: "", attribution: "" };
  }
}

export const BLOCK_TYPE_LABEL: Record<EditorialBlock["type"], string> = {
  paragraph: "Párrafo",
  heading: "Subtítulo",
  image: "Imagen",
  quote: "Cita",
};
