// Iconos de línea para categorías de prenda y logos de tienda genéricos —
// reemplazan los emojis que se usaban antes en InspirationSection y
// WardrobeCompletionSection (👕🧥👖👟👗🧢 y 🛍️/👟 como "logo" de tienda).
// Mismo lenguaje visual que el resto de la app: trazo currentColor, sin relleno.

import type { ClothingCategory } from "@/types/database";

const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function CategoryIcon({ category }: { category: ClothingCategory | string }) {
  switch (category) {
    case "top":
      return (
        <svg {...ICON_PROPS}>
          <path d="M20.4 6.4 16 4l-1.5 2h-5L8 4 3.6 6.4a1 1 0 0 0-.4 1.3l1.6 3a1 1 0 0 0 1.3.4L7 10.4V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-8.6l.9.7a1 1 0 0 0 1.3-.4l1.6-3a1 1 0 0 0-.4-1.3Z" />
        </svg>
      );
    case "bottom":
      return (
        <svg {...ICON_PROPS}>
          <path d="M7 3h10l.8 8.5.9 9a1 1 0 0 1-1 1.1h-3.2a1 1 0 0 1-1-.9L12.4 12h-.8l-1.1 8.7a1 1 0 0 1-1 .9H6.3a1 1 0 0 1-1-1.1l.9-9L7 3Z" />
        </svg>
      );
    case "dress":
      return (
        <svg {...ICON_PROPS}>
          <path d="M9.5 3 8 6l-3.5 12.5A1 1 0 0 0 5.5 20h13a1 1 0 0 0 1-1.5L16 6l-1.5-3" />
          <path d="M9.5 3h5L16 6H8l1.5-3Z" />
        </svg>
      );
    case "outerwear":
      return (
        <svg {...ICON_PROPS}>
          <path d="M9 4 12 6l3-2 4 2.5a1 1 0 0 1 .4 1.3l-1.4 2.7-2-1V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9.5l-2 1-1.4-2.7a1 1 0 0 1 .4-1.3L9 4Z" />
          <path d="M12 6v15" />
        </svg>
      );
    case "footwear":
      return (
        <svg {...ICON_PROPS}>
          <path d="M4 15.5V11c1.8 0 3-.9 3.6-2.2L9 6c.4-.8 1.3-1 2-.5l1.6 1.2c1 .8 2.2 1.3 3.4 1.3H17c1.7 0 3 1.3 3 3v.7c0 .7.3 1.3.8 1.8l1 .9c.8.8.2 2.1-.9 2.1H5.2C4.5 16.5 4 16 4 15.5Z" />
        </svg>
      );
    case "accessory":
      return (
        <svg {...ICON_PROPS}>
          <path d="M4 13a8 8 0 0 1 16 0" />
          <path d="M3 13h18v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3Z" />
        </svg>
      );
    default:
      return (
        <svg {...ICON_PROPS}>
          <path d="M20.4 6.4 16 4l-1.5 2h-5L8 4 3.6 6.4a1 1 0 0 0-.4 1.3l1.6 3a1 1 0 0 0 1.3.4L7 10.4V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-8.6l.9.7a1 1 0 0 0 1.3-.4l1.6-3a1 1 0 0 0-.4-1.3Z" />
        </svg>
      );
  }
}

export function StoreLogoIcon({ type }: { type: "bag" | "shoe" }) {
  if (type === "shoe") {
    return (
      <svg {...ICON_PROPS} width={14} height={14}>
        <path d="M4 15.5V11c1.8 0 3-.9 3.6-2.2L9 6c.4-.8 1.3-1 2-.5l1.6 1.2c1 .8 2.2 1.3 3.4 1.3H17c1.7 0 3 1.3 3 3v.7c0 .7.3 1.3.8 1.8l1 .9c.8.8.2 2.1-.9 2.1H5.2C4.5 16.5 4 16 4 15.5Z" />
      </svg>
    );
  }
  return (
    <svg {...ICON_PROPS} width={14} height={14}>
      <path d="M6 8h12l1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
