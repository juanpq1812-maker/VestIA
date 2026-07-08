// Decide qué ítem de navegación (BottomNav mobile / nav del Header desktop)
// está activo para un pathname dado.
//
// Caso especial: /outfits/saved es la pestaña "Outfits" DEL ARMARIO (vive
// bajo /outfits por historia de rutas, pero el usuario está navegando su
// armario). Por eso cuenta como /wardrobe y NO como AI Studio (/outfits).

export function esRutaActiva(href: string, pathname: string | null): boolean {
  if (!pathname) return false;

  const enOutfitsGuardados =
    pathname === "/outfits/saved" || pathname.startsWith("/outfits/saved/");

  if (href === "/") return pathname === "/";
  if (href === "/wardrobe") {
    return (
      pathname === href || pathname.startsWith(`${href}/`) || enOutfitsGuardados
    );
  }
  if (href === "/outfits") {
    return (
      (pathname === href || pathname.startsWith(`${href}/`)) &&
      !enOutfitsGuardados
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
