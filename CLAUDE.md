@AGENTS.md

---

## PATRONES DE UI

> Todo lo que sigue está extraído del código real del proyecto. No uses clases o valores que no aparezcan aquí sin verificar primero en el componente fuente.

### Botones — `src/components/ui/Button.tsx`

**Clases base (todas las variantes):**
```
inline-flex items-center justify-center gap-2 rounded-full font-semibold
transition-all duration-200 ease-out
disabled:cursor-not-allowed disabled:opacity-60
disabled:hover:translate-y-0 disabled:hover:shadow-none
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
```

| Variante | Clases |
|---|---|
| `primary` | `bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-md hover:-translate-y-px active:translate-y-0 active:bg-primary-active` |
| `secondary` | `bg-primary-light text-primary hover:bg-surface-offset` |
| `ghost` | `bg-transparent text-text-muted border border-border hover:bg-surface-2 hover:text-text` |

| Tamaño | Clases |
|---|---|
| `md` (default) | `px-6 py-3 text-sm` |
| `lg` | `px-8 py-4 text-base` |

- `fullWidth` agrega `w-full`.
- `isLoading` deshabilita el botón y muestra `loadingText` si se provee.
- Los iconos van en `<span aria-hidden="true">` con la prop `leftIcon`/`rightIcon`.
- `aria-busy={isLoading}` es obligatorio para accesibilidad.

---

### Cards — `src/components/ui/Card.tsx`

```
rounded-xl border border-border bg-surface shadow-sm
transition-shadow duration-200 hover:shadow-md
```

| Padding prop | Clases |
|---|---|
| `sm` | `p-4` |
| `md` (default) | `p-6` |
| `lg` | `p-8 md:p-10` |

Úsala para agrupar contenido relacionado: formularios, secciones, estadísticas. No la uses para tarjetas de items del armario (esas tienen su propio patrón, ver ClothingCard abajo).

---

### Chips de categoría / multi-select — `src/components/onboarding/Chip.tsx`

```
inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium
border transition-all duration-150
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
```

| Estado | Clases adicionales |
|---|---|
| Activo (`active=true`) | `border-primary bg-primary text-white shadow-sm` |
| Inactivo | `border-border bg-surface text-text-muted hover:border-primary-mid hover:bg-surface-2 hover:text-text` |

- Siempre incluir `aria-pressed={active}`.
- Cuando se usan como filtros de tabla, añadir `role="tab"` y `aria-selected`.

---

### Input de texto — `src/components/ui/Input.tsx`

```
w-full rounded-md border bg-surface px-4 py-3 text-base text-text
placeholder:text-text-faint transition-colors duration-150
focus:outline-none focus:ring-4
```

| Estado | Clases adicionales |
|---|---|
| Normal | `border-border focus:border-primary focus:ring-primary/15` |
| Con error | `border-danger focus:border-danger focus:ring-danger/15` |

- El mensaje de error: `rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger` con `role="alert"`.
- El hint: `text-xs text-text-muted`.
- El label: `text-sm font-semibold text-text`.
- El `<label>` siempre va asociado al input vía `htmlFor` / `useId()`.

---

### ClothingCard — `src/components/wardrobe/ClothingCard.tsx`

Contenedor:
```
group overflow-hidden rounded-xl border border-border bg-surface shadow-sm
transition-shadow duration-200 hover:shadow-md
```

Imagen (aspect ratio fijo `3/4`):
```
h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]
```

Badge de categoría (top-left):
```
absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1
text-[11px] font-semibold uppercase tracking-wider text-text shadow-sm backdrop-blur
```

CTA secundario dentro de la card:
```
block w-full rounded-lg bg-primary-light px-3 py-2 text-center text-xs font-semibold
text-primary transition-colors hover:bg-primary hover:text-white
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
```

---

### Top App Bar — `src/components/layout/Header.tsx`

```
sticky top-0 z-30 border-b border-divider bg-surface/85 backdrop-blur
supports-[backdrop-filter]:bg-surface/70
```

Inner container: `mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8`

**Nav links desktop:**
| Estado | Clases |
|---|---|
| Activo | `rounded-full px-4 py-2 text-sm font-medium transition-colors bg-primary-light text-primary` |
| Inactivo | `rounded-full px-4 py-2 text-sm font-medium transition-colors text-text-muted hover:bg-surface-2 hover:text-text` |

**Botón hamburguesa mobile** (`40×40 px`):
```
flex h-10 w-10 items-center justify-center rounded-full transition-colors
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
```
- Abierto: `bg-primary-light text-primary`
- Cerrado: `text-text-muted hover:bg-surface-2 hover:text-text`

**Menú desplegable mobile:**
```
absolute left-0 right-0 top-full z-40 border-b border-divider bg-surface shadow-lg
transition-all duration-200 ease-out origin-top
```
- Visible: `opacity-100 translate-y-0 pointer-events-auto`
- Oculto: `opacity-0 -translate-y-2 pointer-events-none`

**Links mobile:**
| Estado | Clases |
|---|---|
| Activo | `flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors bg-primary-light text-primary` |
| Inactivo | `flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors text-text hover:bg-surface-2` |

**Overlay** detrás del menú: `fixed inset-0 top-[57px] z-30 bg-black/20 transition-opacity duration-200 md:hidden`

No existe bottom navigation en la app. La nav es siempre el header superior.

---

### Modal / Bottom Sheet — `src/components/outfits/OutfitUseDateModal.tsx`

**Patrón "bottom sheet on mobile, modal centered on desktop":**

Backdrop:
```
fixed inset-0 z-40 flex items-end justify-center bg-text/40 p-4 sm:items-center
```
Entrada: `style={{ animation: "fadeIn 160ms ease-out" }}`

Panel:
```
w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-lg
```
Entrada: `style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}`

Estructura interna:
- Header: `border-b border-border px-5 py-4` — título en `font-display text-xl font-semibold text-text`
- Cuerpo: `p-5`
- Footer: `flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3`

Siempre incluir `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
Cerrar con ESC y con click en el backdrop.

---

### Toast — `src/components/ui/Toast.tsx`

Posición: `pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4`

Panel: `pointer-events-auto flex max-w-md items-center gap-3 rounded-full border px-5 py-3 text-sm font-medium shadow-lg animate-[fadeInUp_180ms_ease-out]`

| Tipo | Clases del panel |
|---|---|
| `success` | `border-success/30 bg-success-light text-success` |
| `error` | `border-danger/30 bg-danger-light text-danger` |
| `info` | `border-primary-mid bg-primary-light text-primary` |

- Auto-dismiss por defecto a **3 500 ms**.
- `role="status"` + `aria-live="polite"` en el contenedor exterior.
- El patrón de uso: `useState<{ msg: string; kind: "success"|"error"|"info" } | null>` por pantalla, sin contexto global.

---

### Tipografía en pantallas

| Uso | Clases |
|---|---|
| Título H1 de pantalla | `font-display text-3xl font-bold text-text sm:text-4xl` |
| Título H2 de sección | `font-display text-2xl font-bold text-text sm:text-3xl` |
| Título H3 de subsección | `font-display text-xl font-semibold text-text` |
| Eyebrow / label de sección | `text-xs font-bold uppercase tracking-widest text-primary` |
| Cuerpo principal | `text-sm text-text` o `text-base text-text` |
| Texto secundario / muted | `text-sm text-text-muted` o `text-xs text-text-muted` |
| Texto muy sutil | `text-xs text-text-faint` |
| Badge / pill de categoría | `text-[11px] font-semibold uppercase tracking-wider` |
| Link inline | `text-sm font-medium text-primary hover:underline` |

`font-display` = Playfair Display (serif) — solo para títulos.
`font-sans` = DM Sans — todo lo demás, heredado del `body`.

---

## MICRO-INTERACCIONES Y FLUIDEZ

> Estándares que Claude Code debe aplicar siempre al tocar UI, basados en los patrones activos en el proyecto.

### 1. Feedback inmediato en botones

Todos los botones primarios ya implementan:
```
transition-all duration-200 ease-out
hover:-translate-y-px hover:shadow-md
active:translate-y-0 active:bg-primary-active
disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none
```

Al crear botones fuera del componente `Button`, replicar exactamente este patrón. Nunca dejar un botón sin `transition-*` y sin estado `active:`.

---

### 2. Estados de carga con skeletons

El proyecto usa `animate-pulse rounded bg-surface-2` sobre fondo `bg-surface`. El skeleton debe **replicar la estructura visual exacta** de la pantalla para evitar layout shift.

Patrón del archivo `src/app/loading.tsx`:
```tsx
<div className="h-4 w-36 animate-pulse rounded bg-surface-2" />       // texto
<div className="h-8 w-20 animate-pulse rounded bg-surface-2" />       // número grande
<div className="h-8 w-8 animate-pulse rounded-full bg-surface-2" />   // avatar / ícono
<div className="aspect-[3/4] animate-pulse rounded-lg bg-surface-2" /> // tarjeta de prenda
```

Reglas:
- Cada ruta con fetch de servidor necesita su `loading.tsx` con skeletons.
- Los skeletons mantienen las mismas dimensiones aproximadas que el contenido real.
- Nunca mostrar una pantalla completamente en blanco mientras carga.

---

### 3. Spinners para acciones en curso

Patrón unificado en todo el proyecto:
```
h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent
```

Variante pequeña (inline en texto):
```
inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent
```

Usar siempre con `aria-hidden="true"` y texto visible o `aria-label` complementario.

---

### 4. Loading de IA (operaciones largas)

Para operaciones de IA que toman 3-15 segundos, el proyecto usa `LoadingState` en `OutfitGenerator.tsx`. El patrón es:

- **Mensajes motivadores rotativos** — array de strings, rotación cada 3 s con fade-out/fade-in de 300 ms (`transition-opacity duration-300`, opacity controlada por estado).
- **Barra de progreso** — `h-2 rounded-full bg-surface-2` con fill `bg-primary`, animación `transition: "width 15s linear"` de 0 % a 90 % (nunca llega a 100 % para no mentir).

Nunca dejar al usuario mirando solo un spinner sin contexto durante más de 200 ms cuando la operación tarda varios segundos.

---

### 5. Animaciones de entrada

Las keyframes están definidas en `src/app/globals.css` y están disponibles vía clases o `style`:

| Animación | Uso | Implementación |
|---|---|---|
| `fadeInUp` | Toast, elementos nuevos que entran desde abajo | `animate-[fadeInUp_180ms_ease-out]` |
| `fadeIn` | Backdrops de modal | `style={{ animation: "fadeIn 160ms ease-out" }}` |
| `scaleIn` | Panel de modal / bottom sheet | `style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}` |
| `onboarding-fade` | Transición entre pasos del onboarding | `motion-safe:animate-[onboarding-fade_240ms_ease-out]` |

El timing estándar del proyecto es **160-240 ms**. Nada más lento que 300 ms para transiciones de UI (excepto la rotación de mensajes de IA).

Siempre usar el prefijo `motion-safe:` para animaciones en componentes que pueden repetirse, para respetar `prefers-reduced-motion`. El `globals.css` ya incluye el override global:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### 6. Transiciones entre páginas

Next.js App Router maneja la navegación. El proyecto depende de:
- `loading.tsx` por ruta para mostrar skeletons mientras los Server Components resuelven.
- El header es `sticky top-0` y persiste entre navegaciones, dando continuidad visual.
- `router.push()` seguido de `router.refresh()` para forzar re-render con nueva sesión (solo en acciones de auth).

No hay animaciones de transición página-a-página más allá de los skeletons. Si se añaden en el futuro, seguir el timing de 200-300 ms y respetar `motion-safe:`.

---

### 7. Imágenes con fade-in al cargar — `src/components/ui/LazyImage.tsx`

```tsx
<img
  loading="lazy"
  onLoad={() => setLoaded(true)}
  className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
/>
```

- El contenedor padre provee el `backgroundColor` como placeholder visual mientras la imagen carga.
- En `ClothingCard`, el color de placeholder es el `primary_color` de la prenda (`item.primary_color ?? "#E8EFE7"`).
- En `group-hover`: `group-hover:scale-[1.02]` con `transition-transform duration-300`.

---

### 8. Feedback de formularios

- Errores: aparecen **debajo** del campo correspondiente, con `role="alert"` para que los lectores de pantalla los anuncien. Clases: `rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger`.
- Focus ring: `focus:ring-4 focus:ring-primary/15` (normal) o `focus:ring-danger/15` (error).
- El borde cambia de color en foco: `focus:border-primary` o `focus:border-danger`. Transición: `transition-colors duration-150`.

---

### 9. Menú mobile — open/close

El menú usa transformación CSS en lugar de `display:none` para que la transición sea visible:
- Oculto: `opacity-0 -translate-y-2 pointer-events-none`
- Visible: `opacity-100 translate-y-0 pointer-events-auto`
- Transición: `transition-all duration-200 ease-out origin-top`

Bloquear el scroll del body con `document.body.style.overflow = "hidden"` cuando el menú está abierto. Restaurar al cerrar.

---

### 10. Haptic feedback

`navigator.vibrate()` **no está implementado actualmente** en el proyecto. Si se añade en el futuro, el patrón recomendado para acciones con impacto (confirmar uso de outfit, guardar prenda) es:
```ts
if ("vibrate" in navigator) navigator.vibrate(8); // pulso cortísimo, 8ms
```

No usar en hover ni en navegación — solo en confirmación de acciones destructivas o de guardado.

---

### Regla de los 200 ms

Ninguna acción del usuario puede quedar sin feedback visual por más de 200 ms. Checklist:

- Botón clickeado → `isLoading={true}` inmediato antes del await.
- Fetch de página → `loading.tsx` con skeletons ya presente.
- Acción de IA → `LoadingState` con mensajes y barra de progreso.
- Submit de formulario → botón deshabilitado + loadingText.
- Navegación entre tabs → cambio de estado sincrónico, sin delay.
