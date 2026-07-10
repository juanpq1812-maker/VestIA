// Skeleton de /outfits (AI Studio): título + intro + selector de 3 modos +
// chips de ocasión + botón generar. Replica OutfitsPage/OutfitGenerator.

import HeaderSkeleton from "@/components/layout/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />

      <main className="flex-1 pb-24 pt-10 sm:pb-14 sm:pt-14">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Título + intro */}
          <div className="max-w-2xl">
            <div className="h-9 w-44 animate-pulse rounded bg-surface-2 sm:h-10" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-surface-2" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-surface-2" />
          </div>

          <div className="mt-8 space-y-10">
            {/* Card "Crea tu outfit" con los 3 modos */}
            <div className="rounded-xl bg-surface p-5 shadow-sm sm:p-8">
              <div className="h-7 w-40 animate-pulse rounded bg-surface-2" />
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="min-h-[88px] animate-pulse rounded-xl bg-surface-2"
                  />
                ))}
              </div>
              {/* Chips de ocasión */}
              <div className="mt-6">
                <div className="h-4 w-40 animate-pulse rounded bg-surface-2" />
                <div className="mt-4 flex flex-wrap gap-2">
                  {[20, 18, 22, 16, 20, 26, 14, 28].map((w, i) => (
                    <div
                      key={i}
                      className="h-9 animate-pulse rounded-full bg-surface-2"
                      style={{ width: `${w * 4}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Botón generar */}
            <div className="h-[56px] w-full animate-pulse rounded-full bg-surface-2" />
          </div>
        </div>
      </main>
    </div>
  );
}
