import type { ClothingCategory } from "@/types/database";

export type WardrobeSummary = Partial<Record<ClothingCategory, number>>;

export type Tienda = {
  nombre: string;
  url: string;
  logo: string;
};

export const TIENDAS: Record<string, Tienda> = {
  Zara: {
    nombre: "Zara",
    url: "https://www.zara.com/co/es/search?searchTerm=",
    logo: "🛍️",
  },
  "H&M": {
    nombre: "H&M",
    url: "https://www2.hm.com/es_co/resultados.html?q=",
    logo: "🛍️",
  },
  SHEIN: {
    nombre: "SHEIN",
    url: "https://es.shein.com/pdsearch/",
    logo: "🛍️",
  },
  Stradivarius: {
    nombre: "Stradivarius",
    url: "https://www.stradivarius.com/co/es/search?searchTerm=",
    logo: "🛍️",
  },
  Falabella: {
    nombre: "Falabella",
    url: "https://www.falabella.com.co/falabella-co/search?Ntt=",
    logo: "🛍️",
  },
  "Studio F": {
    nombre: "Studio F",
    url: "https://www.studiof.com.co/search?q=",
    logo: "🛍️",
  },
  "Arturo Calle": {
    nombre: "Arturo Calle",
    url: "https://www.arturocalle.com/search?q=",
    logo: "🛍️",
  },
  Undergold: {
    nombre: "Undergold",
    url: "https://undergold.co/search?q=",
    logo: "🛍️",
  },
  Monoic: {
    nombre: "Monoic",
    url: "https://monoic.co/search?q=",
    logo: "🛍️",
  },
  True: {
    nombre: "True",
    url: "https://truepeople.co/search?q=",
    logo: "🛍️",
  },
  Nike: {
    nombre: "Nike",
    url: "https://www.nike.com/co/search?q=",
    logo: "👟",
  },
  Adidas: {
    nombre: "Adidas",
    url: "https://www.adidas.co/search?q=",
    logo: "👟",
  },
  "New Balance": {
    nombre: "New Balance",
    url: "https://www.newbalance.com.co/search?q=",
    logo: "👟",
  },
};

// Category (+ optional gender) → ordered store names (fallback when no style is detected)
const TIENDAS_MAP: Record<string, string[]> = {
  footwear: ["Nike", "Adidas", "New Balance", "Falabella"],
  top_mujer: ["Zara", "Stradivarius", "Studio F", "H&M"],
  top_hombre: ["Arturo Calle", "Zara", "H&M", "Falabella"],
  top: ["Undergold", "Monoic", "SHEIN", "Zara"],
  bottom_mujer: ["Zara", "H&M", "Stradivarius", "Falabella"],
  bottom_hombre: ["Arturo Calle", "Zara", "H&M", "Falabella"],
  bottom: ["Zara", "H&M", "Falabella", "True"],
  dress: ["Zara", "Stradivarius", "H&M", "SHEIN"],
  outerwear: ["Zara", "H&M", "Falabella", "Studio F"],
  accessory: ["Zara", "H&M", "Falabella", "SHEIN"],
};

// Style → stores that specialise in that aesthetic
export const TIENDAS_POR_ESTILO: Record<string, string[]> = {
  streetwear: ["Undergold", "Monoic", "True", "SHEIN"],
  casual: ["Zara", "H&M", "SHEIN", "Falabella"],
  formal: ["Arturo Calle", "Zara", "Studio F", "Falabella"],
  femenino: ["Stradivarius", "Studio F", "Zara", "H&M"],
  deportivo: ["Nike", "Adidas", "New Balance", "Falabella"],
  accesorios: ["Zara", "H&M", "Falabella", "SHEIN"],
};

export function buildStoreUrl(tienda: Tienda, searchTerm: string): string {
  return `${tienda.url}${encodeURIComponent(searchTerm)}`;
}

/**
 * Selección de tiendas para "Inspírate".
 * Si se detectó un estilo, sus tiendas tienen prioridad sobre la categoría.
 * Footwear siempre obtiene tiendas deportivas sin importar el estilo.
 */
export function getTiendasParaCategoria(
  categoria: string,
  genero?: "hombre" | "mujer" | "unisex",
  estilo?: string
): Tienda[] {
  // Footwear: siempre tiendas de calzado, sin importar el estilo del outfit
  if (categoria === "footwear") {
    return TIENDAS_POR_ESTILO["deportivo"]
      .map((n) => TIENDAS[n])
      .filter((t): t is Tienda => Boolean(t));
  }

  // Estilo detectado: las tiendas del estilo tienen prioridad
  if (estilo && TIENDAS_POR_ESTILO[estilo]) {
    return TIENDAS_POR_ESTILO[estilo]
      .map((n) => TIENDAS[n])
      .filter((t): t is Tienda => Boolean(t));
  }

  // Fallback: mapa por categoría + género
  const keyWithGenero =
    genero && genero !== "unisex" ? `${categoria}_${genero}` : null;
  const key =
    keyWithGenero && TIENDAS_MAP[keyWithGenero] ? keyWithGenero : categoria;
  const nombres = TIENDAS_MAP[key] ?? TIENDAS_MAP.accessory;
  return nombres
    .map((n) => TIENDAS[n])
    .filter((t): t is Tienda => Boolean(t));
}

/**
 * Selección de tiendas para "Completa tu armario".
 * Sin imagen ni estilo detectado, muestra una tienda de cada estilo
 * para dar variedad y cubrir distintos perfiles de usuario.
 */
export function getTiendasMixtas(categoria: string): Tienda[] {
  // Footwear siempre recibe tiendas deportivas
  if (categoria === "footwear") {
    return TIENDAS_POR_ESTILO["deportivo"]
      .map((n) => TIENDAS[n])
      .filter((t): t is Tienda => Boolean(t));
  }

  // Para ropa: una tienda representativa de cada estilo principal
  const buckets = ["casual", "femenino", "streetwear", "formal"] as const;
  const result: Tienda[] = [];
  const seen = new Set<string>();

  for (const bucket of buckets) {
    for (const nombre of TIENDAS_POR_ESTILO[bucket] ?? []) {
      if (!seen.has(nombre)) {
        const tienda = TIENDAS[nombre];
        if (tienda) {
          result.push(tienda);
          seen.add(nombre);
          break;
        }
      }
    }
    if (result.length >= 4) break;
  }

  return result;
}
