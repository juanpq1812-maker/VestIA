// Skeleton del Header para los loading.tsx de cada ruta. Replica la geometría
// del Header real (logo centrado en mobile / izquierda en desktop + botón de
// perfil) para que la transición skeleton → página no salte.

export default function HeaderSkeleton() {
  return (
    <div className="border-b border-divider bg-surface">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="absolute left-1/2 h-10 w-24 -translate-x-1/2 animate-pulse rounded bg-surface-2 md:static md:h-12 md:translate-x-0" />
        <span className="h-10 w-10 md:hidden" aria-hidden="true" />
        <div className="h-10 w-10 animate-pulse rounded-full bg-surface-2" />
      </div>
    </div>
  );
}
