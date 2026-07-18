// Skeleton de /comunidad: título + intro, card de reto, grid 2 cols de
// outfits de comunidad y lista de beneficios. Replica ComunidadPage.

import HeaderSkeleton from "@/components/layout/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Título + intro */}
          <div className="h-9 w-48 animate-pulse rounded bg-surface-2 sm:h-10" />
          <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-surface-2" />
          <div className="mt-2 h-4 w-2/3 max-w-md animate-pulse rounded bg-surface-2" />

          {/* Reto de la semana */}
          <div className="mt-10">
            <div className="h-7 w-44 animate-pulse rounded bg-surface-2" />
            <div className="mt-4 rounded-xl bg-surface p-5 shadow-sm">
              <div className="h-5 w-56 animate-pulse rounded bg-surface-2" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-surface-2" />
              <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-surface-2" />
              <div className="mt-4 h-3 w-40 animate-pulse rounded bg-surface-2" />
            </div>
          </div>

          {/* Outfits de la comunidad */}
          <div className="mt-10">
            <div className="h-7 w-64 animate-pulse rounded bg-surface-2" />
            <div className="mt-4 grid grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-xl bg-surface-2"
                />
              ))}
            </div>
          </div>

          {/* El Hilo */}
          <div className="mt-10">
            <div className="h-7 w-40 animate-pulse rounded bg-surface-2" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-2" />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-xl bg-surface shadow-sm">
                  <div className="aspect-[4/3] animate-pulse bg-surface-2" />
                  <div className="p-4">
                    <div className="h-4 w-16 animate-pulse rounded-full bg-surface-2" />
                    <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-surface-2" />
                    <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-surface-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
