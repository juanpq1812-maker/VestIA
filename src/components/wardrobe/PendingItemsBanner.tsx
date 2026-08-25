// Aviso de prendas escaneadas que todavía no entraron al armario.
//
// NO ES DESCARTABLE, a propósito. No es una notificación sobre algo que pasó:
// es el estado actual del armario. Mientras haya prendas sin confirmar, la
// afirmación sigue siendo cierta y el usuario tiene que poder verla. Se apaga
// solo, cuando deja de ser verdad — el conteo se lee del servidor en cada
// render, así que confirmar el lote lo hace desaparecer sin que nadie tenga
// que acordarse de limpiar nada.
//
// Va en /wardrobe y en / (inicio). En el armario porque es donde el usuario
// baja a buscar la prenda que no encuentra; en el inicio porque el BottomNav
// abre ahí y alguien puede pasar días sin entrar al armario.

import Link from "next/link";
import { textoPendientes } from "@/lib/wardrobe/pendingCount";

type Props = {
  count: number;
};

export default function PendingItemsBanner({ count }: Props) {
  const texto = textoPendientes(count);
  if (!texto) return null;

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning-light px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2.5">
        <span
          className="material-symbols-outlined shrink-0 text-lg leading-none text-warning"
          aria-hidden="true"
        >
          inventory_2
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-warning">{texto.titulo}</p>
          <p className="mt-0.5 text-xs text-warning">{texto.detalle}</p>
        </div>
      </div>

      <Link
        href="/wardrobe/upload/review"
        className="shrink-0 rounded-full border border-warning px-4 py-2 text-center text-xs font-semibold text-warning transition-colors hover:bg-warning hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning"
      >
        {texto.cta}
      </Link>
    </div>
  );
}
