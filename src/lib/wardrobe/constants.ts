// Constantes especificas del flujo de subir prenda (`/wardrobe/upload`).
//
// Las dejamos en `lib/wardrobe` porque se consumen tanto en el formulario
// (Client Component) como en cualquier validacion futura del lado servidor.
// Si modificas las opciones, actualizalas aqui — no las dupliques en otros
// archivos.

import type { ClothingCategory } from "@/types/database";

// ---------------------------------------------------------------------------
// Subcategorias por categoria amplia. El valor es lo que se guarda en la
// columna `clothing_items.subcategory` (text), asi que es legible y en
// espanol — el modelo de IA tambien lo va a leer asi.
// ---------------------------------------------------------------------------
// El orden de cada array es el orden en que se pintan los chips en el
// formulario — de lo mas comun a lo menos comun. NO es el orden que usa el
// match de la IA: `matchSubcategory` resuelve empates por opcion mas larga
// (ver aiMapping.ts), justamente para poder mantener este orden pensado para
// el usuario sin que "Falda" le gane a "Falda denim".
export const SUBCATEGORIES: Record<ClothingCategory, readonly string[]> = {
  top: [
    "Camiseta",
    "Camisa",
    "Blusa",
    "Polo",
    "Suéter",
    "Hoodie",
    "Tank top",
    "Crop Top",
    "Body",
    "Corset",
  ],
  bottom: [
    "Jean",
    "Pantalón",
    "Short",
    "Falda",
    "Leggings",
    "Cargo",
    "Jogger",
    "Bermuda",
    "Falda cargo",
    "Falda denim",
  ],
  dress: ["Vestido corto", "Vestido largo", "Enterizo"],
  outerwear: [
    "Chaqueta",
    "Saco",
    "Blazer",
    "Gabán",
    "Abrigo",
    "Abrigo largo",
    "Impermeable",
    "Cardigan",
    "Chaleco",
    "Cortavientos",
    "Gabardina",
  ],
  footwear: [
    "Tenis",
    "Zapatos formales",
    "Sandalias",
    "Botas",
    "Tacones",
    "Mocasines",
    "Zuecos",
    "Chanclas",
  ],
  accessory: [
    "Gorra",
    "Bolso",
    "Cinturón",
    "Bufanda",
    "Reloj",
    "Pañuelo",
    "Sombrero",
    "Gorro",
    "Guantes",
    "Gafas de sol",
    "Collar",
    "Pulsera",
    "Aretes",
    "Anillo",
  ],
};

// ---------------------------------------------------------------------------
// Paleta de colores. Guardamos el `name` (en espanol) en
// `clothing_items.primary_color` para que sea legible. El `swatch` solo se
// usa en el picker visual.
//
// Los swatches son tonos APAGADOS a proposito, no los primarios saturados que
// habia antes (#2563eb, #dc2626, #facc15...). Esos eran un color picker por
// defecto: sobre el bone white del fondo (--color-bg: #fcf9f6) competian en
// saturacion con la foto de la prenda, que es lo unico que deberia gritar en
// esa pantalla.
//
// OJO — cambiar `swatch` NO toca la deteccion. El match de lo que devuelve
// Vision corre contra `COLOR_RGB` en aiMapping.ts, que es una tabla aparte con
// los valores de referencia del color "real", y lo que se persiste en
// `primary_color` es el `name`, nunca el hex. `swatch` es presentacion pura.
// Si algun dia quieres que el match use estos mismos valores, hay que moverlo
// a proposito y medirlo — no pasa solo.
// ---------------------------------------------------------------------------
export type ColorOption = {
  name: string;
  swatch: string; // hex o gradiente para el chip visual.
  contrastText: "light" | "dark"; // para escoger color del check al seleccionar.
};

export const COLOR_PALETTE: readonly ColorOption[] = [
  { name: "negro", swatch: "#1c1c1a", contrastText: "light" },
  { name: "blanco", swatch: "#ffffff", contrastText: "dark" },
  { name: "gris", swatch: "#8e908b", contrastText: "dark" },
  { name: "azul", swatch: "#5b7089", contrastText: "light" },
  { name: "rojo", swatch: "#a35049", contrastText: "light" },
  { name: "verde", swatch: "#7b8c6e", contrastText: "dark" },
  { name: "amarillo", swatch: "#d3ab5f", contrastText: "dark" },
  { name: "rosa", swatch: "#c08f92", contrastText: "dark" },
  { name: "morado", swatch: "#7e6f8c", contrastText: "light" },
  { name: "beige", swatch: "#d6c7a3", contrastText: "dark" },
  { name: "café", swatch: "#7a5a41", contrastText: "light" },
  { name: "naranja", swatch: "#c07b4e", contrastText: "dark" },
  {
    name: "multicolor",
    swatch:
      "conic-gradient(from 0deg, #a35049, #c07b4e, #d3ab5f, #7b8c6e, #5b7089, #7e6f8c, #c08f92, #a35049)",
    contrastText: "light",
  },
];

// ---------------------------------------------------------------------------
// Ocasiones disponibles al subir una prenda. OJO: este set NO es el mismo que
// `OCCASION_TAGS` del onboarding (esas son las ocasiones favoritas del
// usuario). Aqui hablamos de "para que ocasion sirve esta prenda".
// ---------------------------------------------------------------------------
export const ITEM_OCCASIONS: readonly string[] = [
  "Formal",
  "Casual",
  "Deportivo",
  "Fiesta",
  "Trabajo",
  "Universidad",
  "Citas",
  "Casa",
  "Eventos formales",
];

// ---------------------------------------------------------------------------
// Limites de la imagen subida.
// ---------------------------------------------------------------------------
export const MAX_COMPRESSED_BYTES = 2 * 1024 * 1024; // 2 MB — validación post-compresión
export const COMPRESS_MAX_WIDTH_OR_HEIGHT = 1200;
export const COMPRESS_QUALITY = 0.8;
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export const NAME_MAX_LENGTH = 50;

// Colores que aparecen en la fila básica del selector (los más comunes).
// El resto se muestra en la sección expandible.
export const BASIC_COLORS: readonly string[] = [
  "negro", "blanco", "gris", "beige", "café", "azul", "rojo", "verde",
];

// ---------------------------------------------------------------------------
// Ciclo de vida del modo rafaga (`clothing_items.status`, migración 0018).
// Solo las prendas 'confirmed' son parte real del armario del usuario — toda
// query que liste/cuente el armario (o alimente al generador de outfits, los
// quests, o los stats de perfil) debe filtrar por este valor. Excepciones
// documentadas en el propio call site: el export de datos personales
// (GDPR) y las operaciones por id ya conocido (editar/borrar una prenda
// puntual) no lo necesitan.
// ---------------------------------------------------------------------------
export const CONFIRMED_STATUS = "confirmed" as const;
