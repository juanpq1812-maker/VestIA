// Mapeo de subcategoría/categoría → ícono PNG, para el flujo visual de subida
// de prendas (`/wardrobe/upload`).
//
// Esto NO es una taxonomía paralela: la fuente de verdad de qué
// subcategorías existen y en qué orden se ofrecen sigue siendo
// `SUBCATEGORIES` en constants.ts. Acá solo vive el mapeo label → archivo.
//
// Las claves son los labels EXACTOS de SUBCATEGORIES, incluidos acentos y
// mayúsculas intermedias ("Crop Top", "Suéter", "Gabán", "Gafas de sol"). Si
// re-tipeas un label acá en vez de copiarlo, el lookup falla en silencio y la
// prenda cae al ícono genérico de su categoría. `scripts/verify-garment-icons.ts`
// (corre en `npm run build`) atrapa exactamente ese desfase.
//
// Los archivos los genera `scripts/import-garment-icons.mjs` desde la entrega
// original de íconos — ver ese script para el porqué del preprocesamiento.
//
// IMPORTANTE: este archivo solo puede tener `import type`. El script de
// verificación lo importa por ruta relativa desde node (sin bundler), así que
// un import de runtime con alias `@/` lo rompería.

import type { ClothingCategory } from "@/types/database";

const BASE = "/icons/prendas";

// ---------------------------------------------------------------------------
// Íconos de las 6 categorías amplias. Ojo con `bottom.png`: el archivo está en
// singular, a diferencia de `tops.png`.
// ---------------------------------------------------------------------------
export const CATEGORY_ICONS: Record<ClothingCategory, string> = {
  top: `${BASE}/categorias/tops.png`,
  bottom: `${BASE}/categorias/bottom.png`,
  dress: `${BASE}/categorias/vestidos.png`,
  outerwear: `${BASE}/categorias/outwear.png`,
  footwear: `${BASE}/categorias/calzado.png`,
  accessory: `${BASE}/categorias/accesorios.png`,
};

// ---------------------------------------------------------------------------
// Íconos por subcategoría. Las 56 primeras claves corresponden 1:1 con
// SUBCATEGORIES; al final van los valores legacy.
// ---------------------------------------------------------------------------
export const SUBCATEGORY_ICONS: Record<string, string> = {
  // top
  "Camiseta": `${BASE}/tops/camiseta.png`,
  "Camisa": `${BASE}/tops/camisa.png`,
  "Blusa": `${BASE}/tops/blusa.png`,
  "Polo": `${BASE}/tops/polo.png`,
  "Suéter": `${BASE}/tops/sueter.png`,
  "Hoodie": `${BASE}/tops/hoodie.png`,
  "Tank top": `${BASE}/tops/tank-top.png`,
  "Crop Top": `${BASE}/tops/crop-top.png`,
  "Body": `${BASE}/tops/body.png`,
  "Corset": `${BASE}/tops/corset.png`,

  // bottom
  "Jean": `${BASE}/bottoms/jean.png`,
  "Pantalón": `${BASE}/bottoms/pantalon.png`,
  "Short": `${BASE}/bottoms/short.png`,
  "Falda": `${BASE}/bottoms/falda.png`,
  "Leggings": `${BASE}/bottoms/leggings.png`,
  "Cargo": `${BASE}/bottoms/cargo.png`,
  "Jogger": `${BASE}/bottoms/jogger.png`,
  "Bermuda": `${BASE}/bottoms/bermuda.png`,
  "Falda cargo": `${BASE}/bottoms/falda-cargo.png`,
  "Falda denim": `${BASE}/bottoms/falda-denim.png`,

  // dress
  "Vestido corto": `${BASE}/vestidos/vestido-corto.png`,
  "Vestido largo": `${BASE}/vestidos/vestido-largo.png`,
  "Enterizo": `${BASE}/vestidos/enterizo.png`,

  // outerwear
  "Chaqueta": `${BASE}/outwear/chaqueta.png`,
  "Saco": `${BASE}/outwear/saco.png`,
  "Blazer": `${BASE}/outwear/blazer.png`,
  "Gabán": `${BASE}/outwear/gaban.png`,
  "Abrigo": `${BASE}/outwear/abrigo.png`,
  "Abrigo largo": `${BASE}/outwear/abrigo-largo.png`,
  "Impermeable": `${BASE}/outwear/impermeable.png`,
  "Cardigan": `${BASE}/outwear/cardigan.png`,
  "Chaleco": `${BASE}/outwear/chaleco.png`,
  "Cortavientos": `${BASE}/outwear/cortavientos.png`,
  "Gabardina": `${BASE}/outwear/gabardina.png`,

  // footwear
  "Tenis": `${BASE}/calzado/tenis.png`,
  "Zapatos formales": `${BASE}/calzado/zapatos-formales.png`,
  "Sandalias": `${BASE}/calzado/sandalias.png`,
  "Botas": `${BASE}/calzado/botas.png`,
  "Tacones": `${BASE}/calzado/tacones.png`,
  "Mocasines": `${BASE}/calzado/mocasines.png`,
  "Zuecos": `${BASE}/calzado/zuecos.png`,
  "Chanclas": `${BASE}/calzado/chanclas.png`,

  // accessory
  "Gorra": `${BASE}/accesorios/gorra.png`,
  "Bolso": `${BASE}/accesorios/bolso.png`,
  "Cinturón": `${BASE}/accesorios/cinturon.png`,
  "Bufanda": `${BASE}/accesorios/bufanda.png`,
  "Reloj": `${BASE}/accesorios/reloj.png`,
  "Pañuelo": `${BASE}/accesorios/panuelo.png`,
  "Sombrero": `${BASE}/accesorios/sombrero.png`,
  "Gorro": `${BASE}/accesorios/gorro.png`,
  "Guantes": `${BASE}/accesorios/guantes.png`,
  "Gafas de sol": `${BASE}/accesorios/gafas-de-sol.png`,
  "Collar": `${BASE}/accesorios/collar.png`,
  "Pulsera": `${BASE}/accesorios/pulsera.png`,
  "Aretes": `${BASE}/accesorios/aretes.png`,
  "Anillo": `${BASE}/accesorios/anillo.png`,

  // ── Legacy ───────────────────────────────────────────────────────────────
  // Valores que existen en prendas reales de los pilotos pero que ya NO se
  // ofrecen en el picker (no están en SUBCATEGORIES). Están acá solo para que
  // esas prendas sigan renderizando bien en el armario y al editarlas.
  //
  // "Joyería" era un accesorio genérico antes de que se separara en
  // collar/pulsera/aretes/anillo.
  "Joyería": `${BASE}/accesorios/collar.png`,
  // Las 4 variantes de la categoría "body", que se eliminó al ampliar la
  // taxonomía. "Body" sin sufijo sí sigue vivo, como subcategoría de top.
  "Body manga larga": `${BASE}/tops/body.png`,
  "Body manga corta": `${BASE}/tops/body.png`,
  "Body sin mangas": `${BASE}/tops/body.png`,
  "Body escotado": `${BASE}/tops/body.png`,
};

/**
 * Ícono de una subcategoría, con fallback al ícono de su categoría.
 *
 * El fallback es lo que hace que una prenda con subcategoría desconocida
 * (legacy sin mapear, o `null` porque la fila viene de antes de que el campo
 * fuera obligatorio) nunca rompa el render.
 */
export function getSubcategoryIcon(
  label: string | null | undefined,
  category: ClothingCategory
): string {
  if (label && SUBCATEGORY_ICONS[label]) return SUBCATEGORY_ICONS[label];
  return CATEGORY_ICONS[category];
}
