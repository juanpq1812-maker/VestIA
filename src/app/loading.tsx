// Skeleton del dashboard que Next.js muestra mientras page.tsx resuelve
// las queries de Supabase. Replica la estructura visual de DashboardView
// para evitar layout shift al cargar.

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header skeleton */}
      <div className="border-b border-border bg-surface px-6 py-4">
        <div className="h-5 w-20 animate-pulse rounded bg-surface-2" />
      </div>

      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          {/* Saludo skeleton */}
          <div className="mb-8">
            <div className="h-4 w-36 animate-pulse rounded bg-surface-2" />
            <div className="mt-2 h-9 w-64 animate-pulse rounded bg-surface-2" />
          </div>

          <div className="flex flex-col gap-8">
            {/* Métricas: 2 cards */}
            <div className="grid grid-cols-2 gap-4">
              {[0, 1].map((k) => (
                <div
                  key={k}
                  className="flex flex-col items-center rounded-xl border border-border bg-surface p-4 text-center"
                >
                  <div className="h-8 w-8 animate-pulse rounded-full bg-surface-2" />
                  <div className="mt-2 h-8 w-20 animate-pulse rounded bg-surface-2" />
                  <div className="mt-1.5 h-3 w-28 animate-pulse rounded bg-surface-2" />
                </div>
              ))}
            </div>

            {/* Prenda estrella skeleton */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="h-3 w-32 animate-pulse rounded bg-surface-2" />
              <div className="mt-3 flex items-center gap-4">
                <div className="h-16 w-16 flex-shrink-0 animate-pulse rounded-lg bg-surface-2" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
                  <div className="h-3 w-20 animate-pulse rounded bg-surface-2" />
                </div>
              </div>
            </div>

            {/* Preview del armario skeleton */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="h-5 w-28 animate-pulse rounded bg-surface-2" />
                <div className="h-4 w-16 animate-pulse rounded bg-surface-2" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((k) => (
                  <div key={k}>
                    <div className="aspect-[3/4] animate-pulse rounded-lg bg-surface-2" />
                    <div className="mt-1.5 h-3 animate-pulse rounded bg-surface-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* CTA skeleton */}
            <div className="h-12 animate-pulse rounded-xl bg-surface-2" />
          </div>
        </div>
      </main>
    </div>
  );
}
