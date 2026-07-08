// Skeleton del Home que Next.js muestra mientras page.tsx resuelve las
// queries de Supabase. Replica la estructura visual EXACTA del DashboardView
// rediseñado (saludo serif + hero "Outfit del día" + grid de 2 cards +
// banner de inspiración) para evitar layout shift al cargar.

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header skeleton — logo centrado (mobile) / izquierda (desktop) + perfil */}
      <div className="border-b border-divider bg-surface">
        <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="absolute left-1/2 h-10 w-24 -translate-x-1/2 animate-pulse rounded bg-surface-2 md:static md:h-12 md:translate-x-0" />
          <span className="h-10 w-10 md:hidden" aria-hidden="true" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-surface-2" />
        </div>
      </div>

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Saludo serif + fecha */}
          <div className="mb-8">
            <div className="h-9 w-56 animate-pulse rounded bg-surface-2 sm:h-10" />
            <div className="mt-3 h-4 w-40 animate-pulse rounded bg-surface-2" />
          </div>

          <div className="flex flex-col gap-8">
            {/* Hero: Outfit del día (bloque linen con imagen 4:5) */}
            <div className="rounded-xl bg-surface-offset p-5 sm:p-6">
              <div className="h-3 w-44 animate-pulse rounded bg-surface-2" />
              <div className="mt-3 h-8 w-48 animate-pulse rounded bg-surface-2" />
              <div className="mt-4 aspect-[4/5] w-full animate-pulse rounded-lg bg-surface-2 sm:mx-auto sm:max-w-md" />
              <div className="sm:mx-auto sm:max-w-md">
                <div className="mt-4 h-4 w-full animate-pulse rounded bg-surface-2" />
                <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-surface-2" />
                <div className="mt-4 h-[52px] w-full animate-pulse rounded-full bg-surface-2" />
              </div>
            </div>

            {/* Grid secundario: 2 cards cuadradas */}
            <div className="grid grid-cols-2 gap-4 lg:mx-auto lg:max-w-2xl lg:gap-6">
              {[0, 1].map((k) => (
                <div key={k} className="overflow-hidden rounded-xl bg-surface-2/60">
                  <div className="aspect-square w-full animate-pulse bg-surface-2" />
                  <div className="p-4">
                    <div className="h-4 w-28 animate-pulse rounded bg-surface-2" />
                    <div className="mt-2 h-3 w-full animate-pulse rounded bg-surface-2" />
                    <div className="mt-1.5 h-3 w-2/3 animate-pulse rounded bg-surface-2" />
                    <div className="mt-3 h-8 w-32 animate-pulse rounded-full bg-surface-2" />
                  </div>
                </div>
              ))}
            </div>

            {/* Banner de inspiración */}
            <div className="rounded-xl bg-surface-offset p-5 sm:p-6">
              <div className="h-6 w-52 animate-pulse rounded bg-surface-2" />
              <div className="mt-3 h-4 w-full max-w-prose animate-pulse rounded bg-surface-2" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-surface-2" />
              <div className="mt-3 h-4 w-28 animate-pulse rounded bg-surface-2" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
