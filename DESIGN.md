---
name: StrandIA
description: Armario digital con IA — outfits, sostenibilidad y estilo personal.
colors:
  sage-primary: "#5a6e59"
  sage-hover: "#4F5F4F"
  sage-active: "#3F4B3E"
  sage-light: "#E8EFE7"
  sage-mid: "#b8c9b7"
  cream-bg: "#FAF0E6"
  paper-surface: "#FDFAF7"
  sage-tint-surface: "#E8EFE7"
  divider-gray: "#d1d5db"
  border-sage: "rgba(139, 158, 138, 0.25)"
  ink-text: "#2C2C2C"
  text-muted: "#68685A"
  text-faint: "#6B6B57"
  text-inverse: "#FDFAF7"
  success: "#059669"
  success-light: "#d1fae5"
  warning: "#d97706"
  warning-light: "#fef3c7"
  danger: "#dc2626"
  danger-light: "#fee2e2"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.5rem, 4vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "normal"
  headline:
    fontFamily: "Playfair Display, Georgia, 'Times New Roman', serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "DM Sans, Helvetica Neue, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, Helvetica Neue, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.08em"
rounded:
  sm: "0.375rem"
  md: "0.625rem"
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

StrandIA feels like a personal closet photographed for a magazine spread — warm, natural light, sage green and cream paper tones — but disciplined like a well-built product, not a mood board. Playfair Display gives every heading the weight of an editorial pull-quote; DM Sans carries everything functional with quiet precision. The system exists to make the user's own wardrobe photos the visual protagonist: UI chrome recedes into soft cream and sage so real garment colors and textures read as the highlight of every screen.

This system explicitly rejects cold corporate SaaS (no blue-gradient dashboards, no generic flat iconography, no glassmorphism) and rejects fast-fashion urgency (no discount banners, no clashing high-contrast sale colors). It also rejects maximalist fashion-magazine excess — density and ornament stay in check so the product still feels like a clean, fast, trustworthy tool.

**Key Characteristics:**
- Warm neutral base (cream `#FAF0E6` bg, paper `#FDFAF7` surfaces) instead of stark white or cold gray.
- One committed brand hue — sage green — carrying identity across buttons, active states, and accents.
- Serif display type reserved strictly for headings; sans for everything else.
- Nearly flat elevation; shadow is a whisper, not a structural device.
- Fully rounded (`pill`) interactive controls — buttons, chips — paired with generous `xl` radii on content cards.

## 2. Colors

The palette is a restrained warm-neutral field (cream, paper) anchored by a single committed sage green, with muted olive-gray text tones instead of pure black or cold gray.

### Primary
- **Sage** (`#5a6e59`): the one brand color. Primary buttons, active nav states, active chips, focus rings, links. Darkens through **Sage Hover** (`#4F5F4F`) and **Sage Active** (`#3F4B3E`) for interaction states.
- **Sage Light** (`#E8EFE7`): tint of the primary, used as secondary-button fill and as the app's second surface tone (`surface-2`).
- **Sage Mid** (`#b8c9b7`): mid-strength sage for hover borders on inactive chips and subtle accents that need more presence than a divider but less than the full brand color.

### Neutral
- **Warm Cream** (`#FAF0E6`): the page background. This is the brand's signature warmth — deliberately not stark white, not gray.
- **Paper** (`#FDFAF7`): card, input, and header surfaces sitting just above the cream background.
- **Divider Gray** (`#d1d5db`): plain structural dividers where a sage-tinted border would be too loud.
- **Sage Border** (`rgba(139, 158, 138, 0.25)`): the default border for cards, inputs, chips — tinted toward the brand hue rather than neutral gray.
- **Ink** (`#2C2C2C`): primary text. Never pure black.
- **Muted Olive-Gray** (`#68685A`): secondary/muted text — warm-toned gray, not cold gray.
- **Faint Olive-Gray** (`#6B6B57`): the faintest text tier (hints, disabled labels).

### Semantic
- **Success** (`#059669`) / **Success Light** (`#d1fae5`): positive states, sustainable-impact confirmations.
- **Warning** (`#d97706`) / **Warning Light** (`#fef3c7`): caution states.
- **Danger** (`#dc2626`) / **Danger Light** (`#fee2e2`): errors, destructive confirmations.

### Named Rules
**The One Sage Rule.** Sage is the only saturated color in the system. It never competes with a second accent hue — variety comes from tint (light/mid/hover/active), never from introducing blue, purple, or a second brand color.

**The Warm-Never-Cold Rule.** Every neutral in this system — background, surface, border, muted text — carries a warm/olive undertone. A pure gray or pure white anywhere in this system is a bug, not a stylistic choice.

**The Text-Passes-AA Rule.** Every color token that is ever used as text (`text-primary`, `text-muted`, `text-faint`) or as a fill with text on top (`bg-primary` + white button text, active chip fills) must hit ≥4.5:1 against the surface it sits on. `sage-primary`, `text-muted`, and `text-faint` were audited and darkened from their original lighter surface-tint values specifically to satisfy this — do not lighten them back for "elegance." If a new token needs a genuinely light decorative tint with no text ever painted on or over it, add a separate token for that (like `sage-light`/`sage-mid` already are) rather than lightening a text-bearing one.

## 3. Typography

**Display Font:** Playfair Display (with Georgia, Times New Roman, serif fallback)
**Body Font:** DM Sans (with Helvetica Neue, system-ui, sans-serif fallback)

**Character:** A magazine-editorial serif for moments that deserve gravity (screen titles, section headers) paired with a clean, humanist grotesque for everything functional — the pairing reads as "considered fashion editorial" without ever feeling decorative in the UI chrome itself.

### Hierarchy
- **Display / H1** (700, `text-3xl sm:text-4xl`, tight line-height): screen-level titles. Playfair Display only.
- **Headline / H2** (700, `text-2xl sm:text-3xl`): section titles within a screen.
- **Title / H3** (600, `text-xl`): subsection titles, modal headers.
- **Body** (400, `text-sm`–`text-base`, 1.5 line-height): all reading content, form labels, descriptions. Cap prose at 65–75ch.
- **Label** (600, `text-[11px]`–`text-xs`, uppercase, `tracking-wider`): category badges, eyebrow labels — used sparingly, never as a default section kicker (see Do's and Don'ts).

### Named Rules
**The Serif-Never-Body Rule.** Playfair Display renders headings only. It never appears in body copy, buttons, form fields, or navigation — those are always DM Sans.

## 4. Elevation

Nearly flat. Shadow exists as a whisper, not a structural device — its job is to separate a surface from the cream background just enough to read as "raised," never to fake depth for its own sake. No glassmorphism, no glow effects, no gradients simulating light.

### Shadow Vocabulary
- **Ambient Rest** (`box-shadow: 0 1px 3px rgba(44, 44, 44, 0.08)` — `shadow-sm`): default resting state for cards, buttons, badges.
- **Hover Lift** (`box-shadow: 0 4px 16px rgba(44, 44, 44, 0.10)` — `shadow-md`): hover state on cards and primary buttons, always paired with a 1px `-translate-y` nudge.
- **Overlay** (`box-shadow: 0 12px 40px rgba(44, 44, 44, 0.14)` — `shadow-lg`): modals, dropdown menus — the only place a stronger shadow is earned, because it's separating a floating layer from the entire page.

### Named Rules
**The Shadow-as-Breath Rule.** Shadow opacity never exceeds 0.14. If a shadow reads as "dark" or "dramatic," it's wrong for this system — depth here is suggested, not staged.

## 5. Components

Soft and rounded throughout: pill-shaped interactive controls, generously rounded cards. Components feel tactile in motion (hover lift, active press) but the shapes themselves stay calm — roundness carries the warmth, not decoration.

### Buttons
- **Shape:** fully rounded pill (`rounded-full`).
- **Primary:** sage fill (`#5a6e59`), white text, `shadow-sm` at rest.
- **Hover / Focus:** `-translate-y-px` lift + `shadow-md` + darken to Sage Hover (`#4F5F4F`); `active:` returns to baseline y-position with Sage Active (`#3F4B3E`). Focus ring: 2px sage outline, 2px offset.
- **Secondary:** Sage Light fill (`#E8EFE7`), sage text — no shadow, hover shifts background to `surface-2`.
- **Ghost:** transparent, muted text, thin border; hover fills `surface-2` and darkens text to full ink.

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
- **Desktop (md+):** sticky top app bar owns navigation. Active links get a Sage Light pill background with sage text; inactive links are muted text that fills `surface-2` on hover.
- **Mobile:** the top bar shrinks to just logo + logout — primary navigation moves to a fixed bottom nav bar (`BottomNav`), hidden on desktop (`md:hidden`). Three real routes only (Inicio / Armario / Outfits); never a dead link to an unshipped feature. Active item gets a Sage Light pill icon background with sage text and label, matching the desktop active-link language for consistency. Inactive items are muted text/icon. The bar sits on `bg-surface/95` with backdrop-blur and a top divider border, safe-area-aware bottom padding (`env(safe-area-inset-bottom)`). Every page under the bottom nav needs matching bottom padding on its scroll container so content never sits behind the fixed bar.

### Named Rules
**The Real-Routes-Only Rule.** The bottom nav only links to routes that exist and work. A feature that's still a placeholder (like Comunidad) stays a visual card inside a screen, never a bottom nav tab — a global nav slot implies the destination is real.

### ClothingCard (signature component)
The wardrobe item card is the system's signature surface: a fixed 3:4 aspect photo is the dominant element, framed by the same soft rounded-xl card shell. A translucent, blurred category badge floats top-left over the image (`bg-surface/90 backdrop-blur`) so it reads on any garment color. On hover the image scales to 1.02 — a restrained zoom, never a dramatic one — signaling interactivity without distracting from the garment itself.

## 6. Do's and Don'ts

### Do:
- **Do** let the user's garment photos be the most saturated, highest-contrast element on any wardrobe screen — UI chrome stays in the cream/sage/paper register around them.
- **Do** use sage as the only saturated brand color; express variety through its tint scale (light/mid/hover/active), not a second hue.
- **Do** keep shadow opacity at or below 0.14 and pair every hover shadow with a 1px translate lift.
- **Do** reserve Playfair Display for headings only; DM Sans everywhere else.
- **Do** give every interactive element a visible `active:` state, not just `hover:`.
- **Do** keep the timing window at 160–240ms for UI transitions; the AI-loading message rotation is the sanctioned exception.
- **Do** verify contrast (≥4.5:1) whenever introducing a new text/surface color pairing — don't eyeball it.

### Don't:
- **Don't** introduce cold corporate SaaS patterns: blue-gradient panels, generic flat dashboard iconography, glassmorphism used decoratively, gradient-filled text.
- **Don't** use fast-fashion / e-commerce urgency cues: discount banners, high-contrast sale badges, countdown-timer aesthetics.
- **Don't** use pure white or cold gray anywhere — every neutral must carry the warm/olive undertone already defined in the palette.
- **Don't** put a placeholder or unshipped feature in the bottom nav — every tab must go to a real, working route.
- **Don't** stack shadows past `shadow-lg` (`0 12px 40px rgba(44,44,44,0.14)`) — nothing in this system needs to look "dramatic."
- **Don't** let elevation, motion, or ornament outcompete the garment photography — this system serves the wardrobe, it doesn't perform fashion-magazine density for its own sake.
- **Don't** reintroduce the original lighter sage/muted-gray values (`#8B9E8A`, `#9E9E8E`, `#b8b8a8`) as text or button-fill colors — they measured 2.3–2.9:1 against paper/surface-2 and failed WCAG AA even on the primary CTA button.
