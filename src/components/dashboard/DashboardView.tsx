// Dashboard personalizado para usuarios con sesión activa (/).
//
// Server Component: recibe todos los datos pre-calculados desde page.tsx.
// Responsabilidad de este componente: solo UI.
//
// Composición: el hero es la ÚNICA superficie con relleno de la pantalla. Todo
// lo demás se apoya sobre el crema y se agrupa con aire y con los títulos en
// Caslon, no con cajas. Una tarjeta por bloque era lo que hacía que el home se
// leyera como plantilla.
//
//   1. Cabecera: fecha + clima, saludo grande, racha   (DashboardHeadline)
//   2. Hero "Hoy": qué ponerse, 4 estados              (TodayHero)
//   3. Tu semana: los looks que usaste de verdad       (WeekStrip)
//   4. Rescata esta prenda                             (RescataPrenda)
//   5. Agenda de hoy
//   6. Pie: paleta del armario + Hebri                 (QuietFooter)

import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import AgendaCard, { type AgendaEvent } from "@/components/dashboard/AgendaCard";
import TodayHero, { type TodayHeroState } from "@/components/dashboard/TodayHero";
import ConnectCalendarCard from "@/components/dashboard/ConnectCalendarCard";
import DashboardHeadline from "@/components/dashboard/DashboardHeadline";
import WeekStrip, { type LookDeLaSemana } from "@/components/dashboard/WeekStrip";
import RescataPrenda, {
  type PrendaOlvidada,
} from "@/components/dashboard/RescataPrenda";
import QuietFooter from "@/components/dashboard/QuietFooter";
import type { CurrentWeather } from "@/lib/weather/openMeteo";
import type { PetState } from "@/lib/pet/compute";
import type { StreakState } from "@/lib/pet/streak";
import type { TramoDePaleta } from "@/lib/wardrobe/paleta";

type Props = {
  displayName: string;
  totalItems: number;
  petState: PetState;
  prendaOlvidada: PrendaOlvidada | null;
  hasCalendarFeed: boolean;
  agendaEvents: AgendaEvent[];
  heroState: TodayHeroState;
  weather: CurrentWeather | null;
  streak: StreakState;
  looksDeLaSemana: LookDeLaSemana[];
  paleta: TramoDePaleta[];
};

export default function DashboardView({
  displayName,
  totalItems,
  petState,
  prendaOlvidada,
  hasCalendarFeed,
  agendaEvents,
  heroState,
  weather,
  streak,
  looksDeLaSemana,
  paleta,
}: Props) {
  const esUsuarioNuevo = totalItems === 0;

  return (
    <div className="flex flex-1 flex-col">
      <Header displayName={displayName} />

      <main className="flex-1 pb-24 pt-6 sm:pb-14 sm:pt-10">
        <Container size="lg">
          <div className="flex flex-col gap-12 sm:gap-16">
            <DashboardHeadline
              displayName={displayName}
              weather={weather}
              streak={streak}
            />

            <TodayHero state={heroState} />

            {/* Con cero prendas el hero ya dice todo lo que hay que decir:
                apilar semana, agenda y mascota debajo diluye el primer paso. */}
            {esUsuarioNuevo ? null : (
              <>
                <WeekStrip looks={looksDeLaSemana} />

                {prendaOlvidada && <RescataPrenda prenda={prendaOlvidada} />}

                {hasCalendarFeed ? (
                  <AgendaCard events={agendaEvents} />
                ) : (
                  <ConnectCalendarCard />
                )}

                <QuietFooter paleta={paleta} petState={petState} />
              </>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
