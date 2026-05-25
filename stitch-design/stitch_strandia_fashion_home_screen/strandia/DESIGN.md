---
name: StrandIA
colors:
  surface: '#fcf9f6'
  surface-dim: '#dcd9d7'
  surface-bright: '#fcf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f0'
  surface-container: '#f0edea'
  surface-container-high: '#eae8e5'
  surface-container-highest: '#e5e2df'
  on-surface: '#1c1c1a'
  on-surface-variant: '#434842'
  inverse-surface: '#31302f'
  inverse-on-surface: '#f3f0ed'
  outline: '#747872'
  outline-variant: '#c3c8c0'
  surface-tint: '#516351'
  primary: '#516351'
  on-primary: '#ffffff'
  primary-container: '#8b9e8a'
  on-primary-container: '#243526'
  inverse-primary: '#b8ccb6'
  secondary: '#645d56'
  on-secondary: '#ffffff'
  secondary-container: '#ebe1d7'
  on-secondary-container: '#6a635c'
  tertiary: '#5b5f5c'
  on-tertiary: '#ffffff'
  tertiary-container: '#969a96'
  on-tertiary-container: '#2e322f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e8d2'
  primary-fixed-dim: '#b8ccb6'
  on-primary-fixed: '#0f1f11'
  on-primary-fixed-variant: '#3a4b3b'
  secondary-fixed: '#ebe1d7'
  secondary-fixed-dim: '#cec5bc'
  on-secondary-fixed: '#1f1b15'
  on-secondary-fixed-variant: '#4b463f'
  tertiary-fixed: '#e0e3df'
  tertiary-fixed-dim: '#c4c7c3'
  on-tertiary-fixed: '#191c1a'
  on-tertiary-fixed-variant: '#444844'
  background: '#fcf9f6'
  on-background: '#1c1c1a'
  surface-variant: '#e5e2df'
typography:
  display-lg:
    fontFamily: Libre Caslon Text
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Libre Caslon Text
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Libre Caslon Text
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
  headline-md:
    fontFamily: Libre Caslon Text
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  margin-mobile: 20px
  gutter-mobile: 12px
---

## Brand & Style

The design system for this fashion mobile app is rooted in **Organic Minimalism**, blending the timeless elegance of editorial publishing with the clean functionality of modern e-commerce. It targets a discerning audience that values sustainability, high-quality textiles, and a curated shopping experience. 

The visual direction uses a "Soft-Tactile" approach. It avoids the coldness of traditional tech minimalism by using warm neutrals and serif typography, creating an atmosphere that feels like a high-end physical boutique. The emotional response should be one of "Calm Sophistication"—an interface that breathes, allowing the photography of the garments to be the focal point.

Key characteristics include:
- **Editorial Layouts:** Large margins and intentional use of white space.
- **Natural Palette:** Sage and cream tones that evoke a sense of organic luxury.
- **Refined Contrast:** Mixing sharp serif headlines with approachable sans-serif utility text.

## Colors

The palette is inspired by natural fibers and botanical dyes. 

- **Primary (#8B9E8A):** A muted sage green used for primary actions, success states, and brand accents. It represents growth and sustainability.
- **Secondary (#FAF0E6):** A warm linen cream used for large surface areas, creating a softer backdrop than pure white.
- **Tertiary (#2D312E):** A deep, near-black green used for high-contrast text and "Inverted" button states. It provides the grounding force for the lighter colors.
- **Neutral (#F4F1EE):** A soft beige-grey used for secondary backgrounds, input fields, and subtle dividers.

The interface primarily utilizes a light mode to maintain an airy, boutique feel. Dark mode implementation should swap the Secondary cream for the Tertiary dark green as the base surface.

## Typography

This design system employs a pairing of **Libre Caslon Text** for editorial flair and **Hanken Grotesk** for modern legibility.

- **Headlines:** Use Libre Caslon Text to evoke a sense of tradition and luxury. Headlines should use "Sentence case" to maintain an approachable tone. 
- **Body & UI:** Hanken Grotesk is used for all functional text. Its clean, geometric nature ensures readability on small screens.
- **Captions & Labels:** Small labels should use increased letter spacing and a medium-to-bold weight to ensure hierarchy without needing larger font sizes.

## Layout & Spacing

The layout follows a **Fluid Grid** model with generous margins to mimic the look of a printed fashion lookbook.

- **Mobile:** A 4-column grid with 20px outside margins and 12px gutters. Content cards should typically span 2 or 4 columns.
- **Vertical Rhythm:** A strict 4px baseline grid ensures consistent spacing between text elements and icons. 
- **White Space:** Do not fear empty space. Use `xl` (32px) and `2xl` (48px) spacing between distinct sections (e.g., between a "Featured Collection" and "Trending Now") to prevent visual clutter.

## Elevation & Depth

To maintain a soft, organic aesthetic, this design system avoids heavy shadows. 

- **Tonal Layers:** Depth is primarily communicated through color shifts. The base background is the Secondary cream (#FAF0E6), while interactive elements like Search or secondary cards use the Neutral (#F4F1EE) to sit "recessed" or "elevated" respectively.
- **Ambient Soft Shadows:** For elements that require true physical separation (e.g., a "Quick Add" bottom sheet), use a highly diffused shadow: `0px 10px 30px rgba(45, 49, 46, 0.06)`. The shadow color should always be a tinted version of the Tertiary green, never pure black.
- **Outlines:** Use 1px solid borders in the Neutral color for cards when placed on a Secondary background to provide structure without adding weight.

## Shapes

The shape language is consistently **Rounded**, reflecting the softness of fabric and organic forms. 

- **Components:** Standard buttons and input fields use a 0.5rem (8px) radius.
- **Large Containers:** Product cards and image containers should use a 1rem (16px) radius to emphasize the "Soft-Tactile" feel.
- **Search Inputs:** These should be slightly more rounded (0.75rem or 12px) to differentiate them as utility tools.

## Components

- **Buttons:**
    - **Primary:** Background #8B9E8A, Text #FFFFFF. Used for the main CTA (e.g., "Add to Bag").
    - **Secondary:** Background #FFFFFF, Text #2D312E. Used for alternative actions.
    - **Inverted:** Background #2D312E, Text #FFFFFF. Used for high-emphasis editorial moments.
    - **Outlined:** Border 1px #2D312E, Text #2D312E. Used for low-priority actions.
- **Chips:** Small, pill-shaped elements with #F4F1EE background and #2D312E text, used for size selection or product tags.
- **Lists:** Clean lines with #F4F1EE dividers. Use Hanken Grotesk Medium for list item titles.
- **Search Input:** Background #F4F1EE, 12px rounded edges, with a simple 20px line icon on the left.
- **Cards:** Product cards should have no border, using the Secondary or Neutral background colors and 16px corner radius. Product titles should be in Hanken Grotesk, while prices are in Libre Caslon Text.
- **Icons:** 2px stroke width, simple line icons. Icons should be monochrome (#2D312E) to maintain the minimalist feel.