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
  // El nav global solo tiene un ítem "Admin" (-> /admin/quests), pero la
  // sección de admin también incluye /admin/reports (ver AdminTabs) — el
  // ítem del nav global debe marcarse activo en toda la sección.
  if (href === "/admin/quests") {
    return pathname === href || pathname.startsWith("/admin/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
