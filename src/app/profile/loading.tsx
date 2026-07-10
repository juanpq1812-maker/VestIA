// Skeleton de /profile: avatar + nombre, stats de 3 columnas, card "Mi plan"
// y lista de configuración. Replica ProfilePage (Container size="md").

import HeaderSkeleton from "@/components/layout/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Identidad */}
          <div className="flex flex-col items-center text-center">
            <div className="h-24 w-24 animate-pulse rounded-full bg-surface-2" />
            <div className="mt-4 h-8 w-44 animate-pulse rounded bg-surface-2" />
            <div className="mt-2 h-4 w-52 animate-pulse rounded bg-surface-2" />
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 divide-x divide-divider border-y border-divider py-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 px-2">
                <div className="h-8 w-10 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-16 animate-pulse rounded bg-surface-2" />
              </div>
            ))}
          </div>

          {/* Mi plan */}
          <div className="mt-10">
            <div className="h-7 w-28 animate-pulse rounded bg-surface-2" />
            <div className="mt-4 rounded-xl bg-surface-2/60 p-5 sm:p-6">
              <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
              <div className="mt-2 h-4 w-48 animate-pulse rounded bg-surface-2" />
              <div className="mt-4 space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-4 w-3/4 animate-pulse rounded bg-surface-2" />
                ))}
              </div>
              <div className="mt-5 h-12 w-full animate-pulse rounded-full bg-surface-2" />
            </div>
          </div>

          {/* Calendario */}
          <div className="mt-10">
            <div className="h-7 w-36 animate-pulse rounded bg-surface-2" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-2" />
            <div className="mt-4 rounded-xl bg-surface p-5 shadow-sm">
              <div className="h-4 w-48 animate-pulse rounded bg-surface-2" />
              <div className="mt-3 h-12 w-full animate-pulse rounded-md bg-surface-2" />
              <div className="mt-4 h-12 w-full animate-pulse rounded-full bg-surface-2" />
            </div>
          </div>

          {/* Configuración */}
          <div className="mt-10">
            <div className="h-7 w-40 animate-pulse rounded bg-surface-2" />
            <div className="mt-4 divide-y divide-divider overflow-hidden rounded-xl bg-surface shadow-sm">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-4">
                  <div className="h-5 w-36 animate-pulse rounded bg-surface-2" />
                  <div className="h-6 w-24 animate-pulse rounded-full bg-surface-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Cerrar sesión */}
          <div className="mt-10 flex justify-center">
            <div className="h-10 w-32 animate-pulse rounded-full bg-surface-2" />
          </div>
        </div>
      </main>
    </div>
  );
}
