// Contador de cuota mensual de generaciones, para el plan free.
//
// Visible siempre (antes de tocar "Generar"), no solo cuando queda poco —
// asi el usuario decide si vale la pena gastar una generacion. Premium no
// renderiza este componente: la ausencia de fricción es el beneficio, ni
// siquiera se le muestra "ilimitado".

type Props = {
  used: number;
  limit: number;
};

export default function GenerationCounter({ used, limit }: Props) {
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const agotado = remaining === 0;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Este mes
        </p>
        <p className="mt-1 font-display text-lg font-semibold text-text">
          {agotado ? "Sin outfits disponibles" : `${remaining} de ${limit} outfits`}
        </p>
      </div>
      <div
        className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-surface-2 sm:w-28"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={`${used} de ${limit} outfits usados este mes`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${agotado ? "bg-danger" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
