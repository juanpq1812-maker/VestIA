---
name: StrandIA
description: Armario digital con IA — outfits, sostenibilidad y estilo personal.
colors:
  sage-primary: "#516351"
  sage-hover: "#435243"
  sage-active: "#364336"
  sage-light: "#e6ece5"
  sage-mid: "#b8ccb6"
  ink-green: "#2d312e"
  cream-bg: "#fcf9f6"
  paper-surface: "#ffffff"
  neutral-surface: "#f0edea"
  linen-offset: "#ebe1d7"
  divider-gray: "#eae8e5"
  border-warm: "#dcd9d7"
  ink-text: "#1c1c1a"
  text-muted: "#434842"
  text-faint: "#6b6f69"
  text-inverse: "#f3f0ed"
  success: "#059669"
  success-light: "#d1fae5"
  warning: "#d97706"
  warning-light: "#fef3c7"
  danger: "#ba1a1a"
  danger-light: "#ffdad6"
typography:
  display:
    fontFamily: "Libre Caslon Text, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.75rem, 4vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Libre Caslon Text, Georgia, 'Times New Roman', serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: "Hanken Grotesk, Helvetica Neue, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Hanken Grotesk, Helvetica Neue, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.05em"
  label-sm:
    fontFamily: "Hanken Grotesk, Helvetica Neue, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.05em"
    note: "11px. Badges y micro-etiquetas sobre imagen o dentro de cards densas. Nunca texto de lectura."
  icons:
    fontFamily: "Material Symbols Outlined"
    note: "Fuente de íconos de línea (2px stroke visual), monocromos; cargada vía Google Fonts en layout.tsx"
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "1rem"
  xl: "1.5rem"
  full: "9999px"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.sage-primary}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.sage-hover}"
  button-primary-active:
    backgroundColor: "{colors.sage-active}"
  button-secondary:
    backgroundColor: "{colors.sage-light}"
    textColor: "{colors.sage-primary}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.paper-surface}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  chip-active:
    backgroundColor: "{colors.sage-primary}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  chip-inactive:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
---

# Design System: StrandIA

## 1. Overview

**Creative North Star: "The Editorial Wardrobe" (El Armario Editorial)**

StrandIA feels like a personal closet photographed for a magazine spread — warm, natural light, sage green and cream paper tones — but disciplined like a well-built product, not a mood board. Libre Caslon Text gives every heading the weight of an editorial pull-quote; Hanken Grotesk carries everything functional with quiet precision. The system exists to make the user's own wardrobe photos the visual protagonist: UI chrome recedes into soft cream and sage so real garment colors and textures read as the highlight of every screen.

This system explicitly rejects cold corporate SaaS (no blue-gradient dashboards, no generic flat iconography, no glassmorphism) and rejects fast-fashion urgency (no discount banners, no clashing high-contrast sale colors). It also rejects maximalist fashion-magazine excess — density and ornament stay in check so the product still feels like a clean, fast, trustworthy tool.

**Key Characteristics:**
- Warm neutral base (cream `#fcf9f6` bg, white cards, linen `#ebe1d7` editorial sections) instead of stark white-on-gray or cold gray.
- One committed brand hue — sage green — carrying identity across buttons, active states, and accents.
- Serif display type reserved strictly for headings; sans for everything else.
- Nearly flat elevation; shadow is a whisper, not a structural device.
- Fully rounded (`pill`) interactive controls — buttons, chips — paired with generous `xl` radii on content cards.

## 2. Colors

The palette is a restrained warm-neutral field (cream, paper) anchored by a single committed sage green, with muted olive-gray text tones instead of pure black or cold gray.

### Primary
- **Sage** (`#516351`): the one brand color. Primary buttons, active nav states, active chips, focus rings, links. Darkens through **Sage Hover** (`#435243`) and **Sage Active** (`#364336`) for interaction states.
- **Sage Light** (`#e6ece5`): tint of the primary, used as secondary-button fill and active nav pill background.
- **Sage Mid** (`#b8ccb6`): mid-strength sage for hover borders on inactive chips and subtle accents that need more presence than a divider but less than the full brand color.
- **Ink Green** (`#2d312e`): deep near-black green for high-contrast editorial moments (inverted buttons, dark pricing card). Grounding force, used sparingly.

### Neutral
- **Warm Cream** (`#fcf9f6`): the page background — warm near-white, deliberately not stark white, not gray.
- **Paper** (`#ffffff`): card and input surfaces sitting just above the cream background.
- **Neutral Surface** (`#f0edea`): recessed surfaces — search inputs, secondary cards, skeletons.
- **Linen** (`#ebe1d7`): warm linen cream for large editorial sections (hero cards, inspiration banners).
- **Divider** (`#eae8e5`): structural dividers.
- **Warm Border** (`#dcd9d7`): the default 1px border for cards and inputs — structure without weight.
- **Ink** (`#1c1c1a`): primary text. Never pure black.
- **Muted Olive-Gray** (`#434842`): secondary/muted text — warm-toned gray, not cold gray.
- **Faint Olive-Gray** (`#6b6f69`): the faintest text tier (hints, disabled labels). At the AA limit — small secondary text only.

### Semantic
- **Success** (`#059669`) / **Success Light** (`#d1fae5`): positive states.
- **Warning** (`#d97706`) / **Warning Light** (`#fef3c7`): caution states.
- **Danger** (`#ba1a1a`) / **Danger Light** (`#ffdad6`): errors, destructive confirmations.

### Named Rules
**The One Sage Rule.** Sage is the only saturated color in the system. It never competes with a second accent hue — variety comes from tint (light/mid/hover/active), never from introducing blue, purple, or a second brand color.

**The Warm-Never-Cold Rule.** Every neutral in this system — background, surface, border, muted text — carries a warm/olive undertone. A pure gray or pure white anywhere in this system is a bug, not a stylistic choice.

**The Text-Passes-AA Rule.** Every color token that is ever used as text (`text-primary`, `text-muted`, `text-faint`) or as a fill with text on top (`bg-primary` + white button text, active chip fills) must hit ≥4.5:1 against the surface it sits on. `sage-primary`, `text-muted`, and `text-faint` were audited and darkened from their original lighter surface-tint values specifically to satisfy this — do not lighten them back for "elegance." If a new token needs a genuinely light decorative tint with no text ever painted on or over it, add a separate token for that (like `sage-light`/`sage-mid` already are) rather than lightening a text-bearing one.

## 3. Typography

**Display Font:** Libre Caslon Text (with Georgia, Times New Roman, serif fallback)
**Body Font:** Hanken Grotesk (with Helvetica Neue, system-ui, sans-serif fallback)
**Icon Font:** Material Symbols Outlined (monochrome line icons, loaded via Google Fonts)

**Character:** A magazine-editorial serif for moments that deserve gravity (screen titles, section headers) paired with a clean, humanist grotesque for everything functional — the pairing reads as "considered fashion editorial" without ever feeling decorative in the UI chrome itself. Caslon runs at weight 400 by default — its serifs carry the elegance, so bold is reserved for true emphasis.

### Hierarchy
- **Display / H1** (400, `text-3xl sm:text-4xl`, `tracking-tight`): screen-level titles. Libre Caslon Text only, sentence case.
- **Headline / H2** (400, `text-2xl sm:text-3xl`): section titles within a screen.
- **Title / H3** (400–700, `text-xl`): subsection titles, modal headers.
- **Body** (400, `text-sm`–`text-base`, 1.5 line-height): all reading content, form labels, descriptions. Cap prose at 65–75ch.
- **Label** (600, `text-xs`, uppercase, `tracking-wider`): category badges, eyebrow labels — used sparingly, never as a default section kicker (see Do's and Don'ts).
- **Label small** (600, `text-[11px]`, 0.6875rem): el escalón por debajo de Label. Badges sobre imagen y micro-etiquetas dentro de cards densas, donde 12px empuja el layout. **Nunca** para texto de lectura.

### Named Rules
**The 11px-Is-The-Floor Rule.** `text-[11px]` es un escalón real del sistema, no deriva: aparece en ~46 sitios y es el tamaño de los badges. Pero es el PISO. Nada de texto baja de ahí — un `text-[10px]` o un `text-[11.5px]` no es un escalón nuevo, es un valor suelto que hay que subir a 11. Los tamaños en px sobre `.material-symbols-outlined` son la excepción: ahí `font-size` dimensiona el glifo, no tipografía.

**The Serif-Never-Body Rule.** Libre Caslon Text renders headings only. It never appears in body copy, buttons, form fields, or navigation — those are always Hanken Grotesk. One sanctioned exception from the reference designs: prices may render in Caslon as editorial figures.

## 4. Elevation

Nearly flat. Shadow exists as a whisper, not a structural device — its job is to separate a surface from the cream background just enough to read as "raised," never to fake depth for its own sake. No glassmorphism, no glow effects, no gradients simulating light.

### Shadow Vocabulary
Shadows are always tinted with the ink green (`rgba(45, 49, 46, …)`), never pure black.
- **Ambient Rest** (`box-shadow: 0 1px 2px rgba(45, 49, 46, 0.05)` — `shadow-sm`): default resting state for cards, buttons, badges.
- **Hover Lift** (`box-shadow: 0 6px 20px rgba(45, 49, 46, 0.07)` — `shadow-md`): hover state on cards and primary buttons, always paired with a 1px `-translate-y` nudge.
- **Overlay** (`box-shadow: 0 10px 30px rgba(45, 49, 46, 0.10)` — `shadow-lg`): modals, bottom sheets, FABs — the only place a stronger shadow is earned, because it's separating a floating layer from the entire page.

### Named Rules
**The Shadow-as-Breath Rule.** Shadow opacity never exceeds 0.10. Depth is communicated primarily through tonal layers (cream → white → neutral), shadow is the whisper on top. If a shadow reads as "dark" or "dramatic," it's wrong for this system.

## 5. Components

Soft and rounded throughout: pill-shaped interactive controls, generously rounded cards. Components feel tactile in motion (hover lift, active press) but the shapes themselves stay calm — roundness carries the warmth, not decoration.

### Buttons
- **Shape:** fully rounded pill (`rounded-full`).
- **Primary:** sage fill (`#516351`), white text, `shadow-sm` at rest.
- **Hover / Focus:** `-translate-y-px` lift + `shadow-md` + darken to Sage Hover (`#435243`); `active:` returns to baseline y-position with Sage Active (`#364336`). Focus ring: 2px sage outline, 2px offset.
- **Secondary:** Sage Light fill (`#e6ece5`), sage text — no shadow, hover shifts background to `surface-2`.
- **Ghost:** transparent, muted text, thin border; hover fills `surface-2` and darkens text to full ink.
- **Inverted (editorial):** Ink Green fill (`#2d312e`), white text — reserved for high-emphasis editorial moments (e.g. the highlighted pricing card CTA).

### Chips (category / multi-select filters)
- **Style:** pill shape, border + background.
- **Active:** solid sage fill, white text, `shadow-sm`.
- **Inactive:** paper background, sage-tinted border, muted text; hover shifts border to Sage Mid and background to `surface-2`.

### Cards / Containers
- **Corner Style:** generous `xl` radius (1.5rem) — noticeably softer than buttons' functional radii elsewhere.
- **Background:** Paper (`#FDFAF7`).
- **Shadow Strategy:** Ambient Rest at rest, Hover Lift on hover (see Elevation).
- **Border:** thin sage-tinted border (`rgba(139,158,138,0.25)`).
- **Internal Padding:** `sm` 16px / `md` 24px / `lg` 32-40px depending on density.

### Inputs / Fields
- **Style:** Paper background, sage-tinted border, `md` radius.
- **Focus:** border shifts to full Sage + a soft 4px sage ring at 15% opacity — no harsh outline.
- **Error:** border and ring shift to Danger red at the same opacities; error message sits below the field on a Danger Light chip.

### Navigation
- **Desktop (md+):** sticky top app bar owns navigation. Active links get a Sage Light pill background with sage text; inactive links are muted text that fills `surface-2` on hover. The profile entry lives as an icon on the right.
- **Mobile:** the top bar shrinks to logo + profile icon — primary navigation moves to a fixed bottom nav bar (`BottomNav`), hidden on desktop (`md:hidden`). Four real routes (Inicio / Armario / AI Studio / Comunidad). Active item gets a Sage Light pill icon background with sage text and label; inactive items are muted text/icon. The bar sits on `bg-surface/95` with backdrop-blur and a top divider border, safe-area-aware bottom padding (`env(safe-area-inset-bottom)`). Every page under the bottom nav needs matching bottom padding on its scroll container so content never sits behind the fixed bar.

### Named Rules
**The Real-Routes-Only Rule.** The bottom nav only links to routes that exist and work. A feature that's still a placeholder stays a visual card inside a screen, never a bottom nav tab — a global nav slot implies the destination is real. (Comunidad earned its tab when it became a real route; its not-yet-functional pieces are labeled "Próximamente" inside the screen.)

### ClothingCard (signature component)
The wardrobe item card is the system's signature surface: a fixed 3:4 aspect photo is the dominant element, framed by the same soft rounded-xl card shell. A translucent, blurred category badge floats top-left over the image (`bg-surface/90 backdrop-blur`) so it reads on any garment color. On hover the image scales to 1.02 — a restrained zoom, never a dramatic one — signaling interactivity without distracting from the garment itself.

## 6. Do's and Don'ts

### Do:
- **Do** let the user's garment photos be the most saturated, highest-contrast element on any wardrobe screen — UI chrome stays in the cream/sage/paper register around them.
- **Do** use sage as the only saturated brand color; express variety through its tint scale (light/mid/hover/active), not a second hue.
- **Do** keep shadow opacity at or below 0.14 and pair every hover shadow with a 1px translate lift.
- **Do** reserve Libre Caslon Text for headings only; Hanken Grotesk everywhere else.
- **Do** give every interactive element a visible `active:` state, not just `hover:`.
- **Do** keep the timing window at 160–240ms for UI transitions; the AI-loading message rotation is the sanctioned exception.
- **Do** verify contrast (≥4.5:1) whenever introducing a new text/surface color pairing — don't eyeball it.

### Don't:
- **Don't** introduce cold corporate SaaS patterns: blue-gradient panels, generic flat dashboard iconography, glassmorphism used decoratively, gradient-filled text.
- **Don't** use fast-fashion / e-commerce urgency cues: discount banners, high-contrast sale badges, countdown-timer aesthetics.
- **Don't** use pure white or cold gray anywhere — every neutral must carry the warm/olive undertone already defined in the palette.
- **Don't** put a placeholder or unshipped feature in the bottom nav — every tab must go to a real, working route.
- **Don't** stack shadows past `shadow-lg` (`0 10px 30px rgba(45,49,46,0.10)`) — nothing in this system needs to look "dramatic."
- **Don't** let elevation, motion, or ornament outcompete the garment photography — this system serves the wardrobe, it doesn't perform fashion-magazine density for its own sake.
- **Don't** use the lighter sage tints (`#8b9e8a`, `#b8ccb6`) as text or as button fill with white text — they fail WCAG AA. They live as decorative surfaces and borders only; text-bearing sage is always `#516351` or darker.
