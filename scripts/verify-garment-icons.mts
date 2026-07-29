// Verifica que todo label de subcategoría/categoría tenga su archivo de ícono
// en `public/`. Corre en `npm run build` (via `npm run verify:icons`).
//
// Sin esto, un typo en un slug de `icons.ts` o una subcategoría nueva agregada
// a `SUBCATEGORIES` sin su ícono no se notan: `getSubcategoryIcon` cae al
// ícono genérico de la categoría y la UI se ve "casi bien". Preferimos que el
// build falle.
//
// Se corre con node directo — Node 22.18+ hace type stripping sin flags:
//
//   npm run verify:icons
//
// La extensión es `.mts` (no `.ts`) para que node lo trate como ESM sin
// necesidad de `"type": "module"` en package.json — que rompería
// `scripts/prune-imgly-assets.js`, que es CommonJS. El
// `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON` del npm script silencia el
// aviso que node emite por los `.ts` de `src/` que sí importa este script.
//
// OJO: los imports de acá son rutas relativas con extensión `.ts`, y
// toda la cadena que se importa (icons.ts → constants.ts → types/database)
// solo puede tener `import type` del alias `@/`. Node no resuelve ese alias,
// pero los imports de tipo se borran antes de ejecutarse. Si algún día
// `icons.ts` o `constants.ts` adquieren un import de RUNTIME con `@/`, este
// script deja de correr y hay que darle un resolver (o moverlo a un test).

import { existsSync } from "node:fs";
import path from "node:path";
import { SUBCATEGORIES } from "../src/lib/wardrobe/constants.ts";
import {
  CATEGORY_ICONS,
  SUBCATEGORY_ICONS,
  getSubcategoryIcon,
} from "../src/lib/wardrobe/icons.ts";
import type { ClothingCategory } from "../src/types/database.ts";

const PUBLIC_DIR = path.join(process.cwd(), "public");

const problems: string[] = [];

function checkFile(iconPath: string, context: string) {
  // Las rutas del mapa son URLs absolutas del sitio ("/icons/..."), así que se
  // resuelven contra public/, no contra el cwd.
  if (!existsSync(path.join(PUBLIC_DIR, iconPath))) {
    problems.push(`${context}: falta el archivo public${iconPath}`);
  }
}

// 1. Los 6 íconos de categoría existen.
for (const [category, iconPath] of Object.entries(CATEGORY_ICONS)) {
  checkFile(iconPath, `categoría "${category}"`);
}

// 2. Toda subcategoría ofrecida en el picker tiene entrada en el mapa, y su
//    archivo existe. Un label sin entrada caería al ícono de la categoría —
//    que renderiza, pero es un bug silencioso, no un fallback deseado.
let offered = 0;
for (const [category, subs] of Object.entries(SUBCATEGORIES) as [
  ClothingCategory,
  readonly string[],
][]) {
  for (const label of subs) {
    offered++;
    if (!SUBCATEGORY_ICONS[label]) {
      problems.push(
        `subcategoría "${label}" (${category}): sin entrada en SUBCATEGORY_ICONS — revisa que el label esté copiado EXACTO de SUBCATEGORIES (acentos y mayúsculas incluidos)`
      );
      continue;
    }
    checkFile(SUBCATEGORY_ICONS[label], `subcategoría "${label}" (${category})`);
  }
}

// 3. Toda entrada del mapa apunta a un archivo real, incluidas las legacy que
//    no están en SUBCATEGORIES.
for (const [label, iconPath] of Object.entries(SUBCATEGORY_ICONS)) {
  checkFile(iconPath, `entrada de mapa "${label}"`);
}

// 4. El fallback funciona: una subcategoría desconocida y una nula devuelven el
//    ícono de la categoría, no undefined. Es la garantía de que una prenda
//    legacy sin mapear nunca rompe el render.
for (const category of Object.keys(CATEGORY_ICONS) as ClothingCategory[]) {
  for (const label of ["__no-existe__", null]) {
    if (getSubcategoryIcon(label, category) !== CATEGORY_ICONS[category]) {
      problems.push(
        `getSubcategoryIcon(${JSON.stringify(label)}, "${category}") no cayó al ícono de la categoría`
      );
    }
  }
}

const legacy = Object.keys(SUBCATEGORY_ICONS).length - offered;

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} problema(s) con los íconos de prenda:\n`);
  for (const p of problems) console.error(`  · ${p}`);
  console.error("");
  process.exit(1);
}

console.log(
  `✓ íconos de prenda OK — ${offered} subcategorías ofrecidas + ${legacy} legacy + ${Object.keys(CATEGORY_ICONS).length} categorías`
);
