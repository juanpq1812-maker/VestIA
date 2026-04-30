import Link from "next/link";

type Props = {
  titulo: string;
  descripcion: string;
};

export default function PaginaStub({ titulo, descripcion }: Props) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-xl text-center">
        <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
          En construccion
        </span>
        <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          {titulo}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{descripcion}</p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}
