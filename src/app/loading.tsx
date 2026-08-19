// Skeleton del Home que Next muestra mientras page.tsx resuelve sus queries.
//
// Replica la estructura REAL de DashboardView para que no haya salto de layout
// al llegar el contenido. Este archivo llevaba dibujando el hero "Outfit del
// día" —con su imagen 4:5— mucho después de que ese hero dejara de existir, y
// el salto se veía en cada carga.
//
// Si cambias el orden o el tamaño de los bloques del home, este archivo
// cambia con ellos.

import HeaderSkeleton from "@/components/layout/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />

      <main className="flex-1 pb-24 pt-6 sm:pb-14 sm:pt-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-12 sm:gap-16">
            {/* 1 · Cabecera: fecha + clima, saludo enorme, racha */}
            <div className="flex flex-col gap-5">
              <div className="h-5 w-64 animate-pulse rounded bg-surface-2" />
              {/* Espeja clamp(2.75rem, 10vw, 4.5rem) con leading 0.92 */}
              <div className="h-[clamp(2.5rem,9.2vw,4.15rem)] w-72 animate-pulse rounded bg-surface-2" />
              <div className="h-5 w-48 animate-pulse rounded bg-surface-2" />
            </div>

            {/* 2 · Hero: lino con el moodboard a la izquierda desde sm */}
            <div className="rounded-xl bg-surface-offset px-5 py-8 sm:px-10 sm:py-12">
              <div className="sm:mx-auto sm:flex sm:max-w-3xl sm:items-center sm:gap-10">
                <div className="aspect-square w-full animate-pulse rounded-2xl bg-surface sm:aspect-[4/5] sm:w-1/2 sm:shrink-0" />
                <div className="mt-6 flex flex-col items-center gap-4 sm:mt-0 sm:w-1/2 sm:items-start">
                  <div className="h-4 w-40 animate-pulse rounded bg-surface-2" />
                  <div className="h-8 w-56 animate-pulse rounded bg-surface-2" />
                  <div className="h-4 w-full max-w-[42ch] animate-pulse rounded bg-surface-2" />
                  <div className="h-[52px] w-44 animate-pulse rounded-full bg-surface-2" />
                </div>
              </div>
            </div>

            {/* 3 · Tu semana: tira de láminas */}
            <div className="flex flex-col gap-5">
              <div className="h-7 w-40 animate-pulse rounded bg-surface-2" />
              <div className="flex gap-5">
                {[0, 1, 2].map((k) => (
                  <div key={k} className="flex w-28 shrink-0 flex-col gap-2 sm:w-32">
                    <div className="aspect-square w-full animate-pulse rounded-2xl bg-surface-2" />
                    <div className="h-3 w-14 animate-pulse rounded bg-surface-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* 4 · Hebri, centrada */}
            <div className="flex flex-col gap-6">
              <div className="h-7 w-24 animate-pulse rounded bg-surface-2" />
              <div className="flex flex-col items-center gap-6">
                <div className="h-[280px] w-[280px] max-w-full animate-pulse rounded-full bg-surface-2" />
                <div className="flex w-full max-w-xs flex-col items-center gap-4">
                  <div className="h-6 w-56 animate-pulse rounded bg-surface-2" />
                  <div className="h-1.5 w-52 animate-pulse rounded-full bg-surface-2" />
                  <div className="h-4 w-28 animate-pulse rounded bg-surface-2" />
                </div>
              </div>
            </div>

            {/* 5 · Agenda */}
            <div className="flex flex-col gap-5">
              <div className="h-7 w-44 animate-pulse rounded bg-surface-2" />
              <div className="h-4 w-full max-w-[52ch] animate-pulse rounded bg-surface-2" />
            </div>

            {/* 6 · El Hilo: portada + texto */}
            <div className="flex flex-col gap-5">
              <div className="h-7 w-28 animate-pulse rounded bg-surface-2" />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                <div className="aspect-[16/9] w-full animate-pulse rounded-lg bg-surface-2 sm:aspect-[4/3] sm:w-64 sm:shrink-0" />
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
                  <div className="h-6 w-64 animate-pulse rounded bg-surface-2" />
                  <div className="h-4 w-full max-w-[46ch] animate-pulse rounded bg-surface-2" />
                </div>
              </div>
            </div>

            {/* 7 · Paleta */}
            <div className="flex flex-col gap-2.5 border-t border-divider pt-8">
              <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
              <div className="h-1.5 w-full max-w-md animate-pulse rounded-full bg-surface-2" />
              <div className="h-3 w-72 max-w-full animate-pulse rounded bg-surface-2" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
