# Assets de CameraTipsModal

Reemplaza estos archivos para actualizar el set de fotos del modal de tips —
no hace falta tocar código (`src/components/wardrobe/CameraTipsModal.tsx`).

**Specs:** JPG, aspect ratio 3:4 (recomendado ~900×1200px), ~150-200KB por archivo.

| Archivo | Uso |
|---|---|
| `ejemplo-ideal.jpg` | Protagonista: la foto "de catálogo" (prenda completa, luz natural, fondo limpio) |
| `evita-oscura.jpg` | Ejemplo de foto oscura / mal iluminada |
| `evita-borrosa.jpg` | Ejemplo de foto borrosa |
| `evita-parcial.jpg` | Ejemplo que solo muestra parte de la prenda |
| `evita-fondo-cargado.jpg` | Ejemplo con fondo desordenado |
| `antes.jpg` | Foto original tal como la tomaría un usuario (para el bloque antes/después) |
| `despues.jpg` | La misma prenda reconstruida por la IA |

Si falta un archivo, el modal muestra un fallback digno (fondo `surface` + el
ícono de esa tarjeta) — nunca se ve roto. El bloque antes/después solo
aparece cuando **ambos** `antes.jpg` y `despues.jpg` existen.
