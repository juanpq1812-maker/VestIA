import Link from "next/link";

const rutas = [
  { href: "/login", titulo: "Login", descripcion: "Iniciar sesion" },
  { href: "/register", titulo: "Registro", descripcion: "Crear cuenta" },
  {
    href: "/onboarding",
    titulo: "Onboarding",
    descripcion: "Estilo y ocasiones",
  },
  {
    href: "/wardrobe",
    titulo: "Armario",
    descripcion: "Ver tus prendas",
  },
  {
    href: "/wardrobe/upload",
    titulo: "Subir prenda",
    descripcion: "Anadir foto al armario",
  },
  {
    href: "/outfits",
    titulo: "Outfits IA",
    descripcion: "Generar outfits con IA",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          VestIA
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Tu armario digital con IA. Genera outfits y mide el impacto
          sostenible de tu ropa.
        </p>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Rutas del MVP
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {rutas.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="block rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-50">
                  {r.titulo}
                </div>
                <div className="text-sm text-zinc-500">{r.descripcion}</div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-xs text-zinc-400">
          Proyecto de grado — Universidad Sergio Arboleda
        </p>
      </div>
    </main>
  );
}
