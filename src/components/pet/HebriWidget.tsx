// Card de Hebri para el Home — tamaño discreto, no domina la pantalla.
// Server Component: recibe el estado ya calculado (sin re-fetch en cliente).

import Link from "next/link";
import Card from "@/components/ui/Card";
import HebriSprite from "@/components/pet/HebriSprite";
import { PET_MOOD_SHORT_MESSAGE } from "@/components/pet/moodMessages";
import type { PetState } from "@/lib/pet/compute";

export default function HebriWidget({ score, mood, isDirty }: PetState) {
  return (
    <Link href="/pet" className="block">
      <Card padding="sm" className="cursor-pointer">
        <div className="flex items-center gap-3.5">
          <HebriSprite mood={mood} isDirty={isDirty} size={72} className="flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-primary">
              Tu compañera diaria
            </p>
            <h3 className="mt-0.5 font-display text-base font-semibold text-text">Hebri</h3>
            <p className="mt-0.5 text-xs leading-snug text-text-muted">
              {PET_MOOD_SHORT_MESSAGE[mood]}
            </p>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
          <span aria-hidden="true" className="flex-shrink-0 text-lg text-text-faint">
            ›
          </span>
        </div>
      </Card>
    </Link>
  );
}
