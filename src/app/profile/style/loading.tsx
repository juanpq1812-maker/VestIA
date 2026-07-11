// Skeleton de /profile/style — replica la estructura del formulario de
// preferencias para evitar layout shift mientras el Server Component resuelve.

import Container from "@/components/ui/Container";

export default function StylePreferencesLoading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header placeholder */}
      <div className="sticky top-0 z-30 border-b border-divider bg-surface/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="h-8 w-28 animate-pulse rounded bg-surface-2" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-surface-2" />
        </div>
      </div>

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="md">
          {/* Link de volver + título */}
          <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
          <div className="mt-4 h-9 w-56 animate-pulse rounded bg-surface-2" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-surface-2" />

          {/* Cards de chips y tallas */}
          <div className="mt-8 flex flex-col gap-6">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm"
              >
                <div className="h-6 w-40 animate-pulse rounded bg-surface-2" />
                <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-2" />
                <div className="mt-5 flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4, 5].map((j) => (
                    <div
                      key={j}
                      className="h-9 w-24 animate-pulse rounded-full bg-surface-2"
                    />
                  ))}
                </div>
              </div>
            ))}
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm"
              >
                <div className="h-6 w-40 animate-pulse rounded bg-surface-2" />
                <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-2" />
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {[0, 1, 2].map((j) => (
                    <div
                      key={j}
                      className="h-12 animate-pulse rounded-md bg-surface-2"
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="h-12 w-full animate-pulse rounded-full bg-surface-2" />
          </div>
        </Container>
      </main>
    </div>
  );
}
