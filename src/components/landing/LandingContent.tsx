// Landing pública de StrandIA — scroll narrativo que explica el producto en
// una pasada: la ropa que ya tienes + IA = tu outfit de hoy.
//
// Server Component que compone el scroll suave (Lenis) + el hero animado +
// los reveals al hacer scroll. Ya no queda ninguna foto de stock: todo lo que
// se ve —prendas, recortes, Hebri, la lámina editorial— sale de assets reales
// del producto, que es lo que separa esta landing de cualquier otra de moda.

import Link from "next/link";
import Image from "next/image";
import Container from "@/components/ui/Container";
import SmoothScroll from "./SmoothScroll";
import LandingHero from "./LandingHero";
import Reveal from "./Reveal";

// ── Las visuales de "Cómo funciona" ─────────────────────────────────────────
//
// Cada paso llevaba una foto de stock de Unsplash: percheros con ropa colgada,
// tres veces casi la misma imagen. Bonitas y mudas — ninguna mostraba qué hace
// StrandIA. Ahora cada paso demuestra su propia tecnología con assets reales
// del producto.
//
// Todas se montan dentro de la misma lámina (aspect fijo, overflow hidden) que
// antes ocupaba la foto, así que la retícula alterna igual que siempre.

/** Paso 01 — la foto del celular contra la misma prenda ya recortada. */
function VisualRecorte() {
  return (
    <div className="relative h-full w-full">
      {/* La foto tal como sale del celular: la prenda puesta, con su fondo */}
      <Image
        src="/camera-tips/antes.jpg"
        alt="Foto de una prenda tomada con el celular, con el fondo del lugar"
        fill
        loading="lazy"
        sizes="(max-width: 1024px) 90vw, 45vw"
        className="object-cover"
      />
      {/* Velo: baja la foto original para que el recorte sea lo que se mira */}
      <div aria-hidden="true" className="absolute inset-0 bg-ink/40" />

      <span className="absolute left-4 top-4 rounded-full bg-ink/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur">
        Tu foto
      </span>

      {/* La misma prenda, ya recortada, sobre su lámina blanca. El PNG real es
          un JPG de fondo blanco, así que la lámina no es decoración: sin ella
          el recorte se derrama sobre el papel y deja de leerse como objeto. */}
      <div className="absolute right-4 top-[8%] h-[66%] w-[36%] rounded-xl border border-white/70 bg-white p-2 shadow-xl sm:right-6 sm:w-[32%]">
        <div className="relative h-full w-full">
          <Image
            src="/camera-tips/despues.jpg"
            alt="La misma prenda recortada sobre fondo blanco, lista para el armario"
            fill
            loading="lazy"
            sizes="(max-width: 1024px) 35vw, 16vw"
            className="object-contain"
          />
        </div>
      </div>

      <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-text shadow-sm">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-primary">
          <path d="M12 2l1.8 5.4L19 9.2l-5.2 1.8L12 16l-1.8-5L5 9.2l5.2-1.8L12 2z" />
        </svg>
        Fondo eliminado automáticamente
      </span>
    </div>
  );
}

/**
 * Paso 02 — tres prendas coordinadas, unidas por el hilo de la combinación.
 *
 * Fotografías reales recortadas por el propio pipeline, exportadas con
 * scripts/export-landing-garments.mjs. Antes eran ilustraciones de línea.
 */
const LOOK = [
  { src: "/landing-outfits/paso2-top.png", alt: "Suéter beige de punto grueso" },
  { src: "/landing-outfits/paso2-bottom.png", alt: "Pantalón cargo verde militar" },
  { src: "/landing-outfits/paso2-calzado.png", alt: "Botas chelsea negras" },
];

function VisualCombina() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface-2 px-6 py-6 sm:gap-4 sm:px-10">
      <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
        Look sugerido
      </p>
      <div className="relative w-full">
        {/* El hilo pasa POR DETRÁS de las láminas, así que solo asoma en los
            huecos: las tres prendas se leen enhebradas, no sueltas. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-primary-mid"
        />
        <ul className="relative grid grid-cols-3 gap-3">
          {LOOK.map((prenda) => (
            <li
              key={prenda.src}
              className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-white shadow-sm"
            >
              {/* `contain`, no `cover`: son recortes de proporciones dispares. */}
              <Image
                src={prenda.src}
                alt={prenda.alt}
                fill
                loading="lazy"
                sizes="(max-width: 640px) 28vw, 150px"
                className="object-contain p-1.5 sm:p-2.5"
              />
            </li>
          ))}
        </ul>
      </div>

      <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
        Combinan · 93% de afinidad
      </p>
    </div>
  );
}

/** Paso 03 — la rotación del armario, con Hebri juzgando el resultado. */
function VisualRotacion() {
  return (
    <div className="flex h-full w-full items-center gap-2 bg-surface-2 px-4 py-5 sm:gap-4 sm:px-7 sm:py-7">
      <div className="relative h-full w-[40%] shrink-0 overflow-hidden sm:w-[46%]">
        <Image
          src="/hebri/estados/hebri_sassy.png"
          alt="Hebri, la mascota de StrandIA, mirando de reojo"
          fill
          loading="lazy"
          sizes="(max-width: 1024px) 40vw, 20vw"
          className="scale-[2.1] object-contain"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="rounded-xl bg-white p-3 shadow-sm sm:p-4">
          <p className="font-display text-2xl leading-none tabular-nums text-primary sm:text-3xl">
            82%
          </p>
          <p className="mt-1 text-[11px] font-medium leading-tight text-text-muted sm:text-xs">
            de tu armario usado este mes
          </p>
          <span
            aria-hidden="true"
            className="mt-3 block h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <span className="block h-full rounded-full bg-primary" style={{ width: "82%" }} />
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-white p-2.5 shadow-sm sm:gap-2.5 sm:p-3">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <span className="min-w-0 text-xs leading-snug text-text">
            <span className="font-semibold">Prenda rescatada</span>
            <span className="block text-text-muted">Sin usar desde marzo</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Diseñado para resolver ───────────────────────────────────────────────────
//
// Esta sección tuvo una primera versión con testimonios y métricas de tracción
// inventados ("+10.000 prendas" contra las ~266 reales, y tres personas que no
// existían). Se descartó: es publicidad engañosa y en Colombia la sanciona la
// SIC. Lo que quedó son afirmaciones sobre lo que el producto HACE, no sobre
// cuánta gente lo usa — así que no caducan ni dependen de una consulta.
//
// Si alguien vuelve a tocar esto: cada cifra tiene que poder señalarse en el
// código. Las de abajo se pueden. No metas números de tracción sin datos.

type Metrica = {
  valor: string;
  label: string;
  /**
   * Amplía SOLO el glifo, no la caja: Libre Caslon dibuja el ∞ con muy poca
   * altura y al lado de "100%" parecía un error. Escalar con `transform` deja
   * intacto el alto de línea, así que las cuatro cifras siguen cuadradas
   * arriba y las etiquetas no se desalinean.
   */
  escalaGlifo?: number;
};

const METRICAS: Metrica[] = [
  // La generación solo recibe prendas del armario del usuario; no hay catálogo.
  { valor: "100%", label: "Ropa de tu clóset real" },
  // El recorte lo hace el pipeline de imagen, no la persona: ver
  // src/lib/ai/imageBackgroundRemoval.ts.
  { valor: "0 seg", label: "De recorte manual (fondos eliminados por IA)" },
  // `generateOutfits` pide el clima actual a Open-Meteo y lo mete en el prompt.
  { valor: "1 tap", label: "Para recibir tu outfit calibrado al clima" },
  // La única de las cuatro que es retórica y no medida: el armario es finito.
  { valor: "∞", label: "Combinaciones posibles con tus prendas", escalaGlifo: 1.7 },
];

type Pilar = { titulo: string; texto: string };

const PILARES: Pilar[] = [
  {
    titulo: "Cero estrés matutino",
    texto: "Tu look listo antes de que te tomes el primer café.",
  },
  {
    titulo: "Moda consciente",
    texto:
      "Redescubre piezas olvidadas antes de comprar ropa innecesaria.",
  },
  {
    titulo: "Contexto real",
    texto:
      "Combinaciones pensadas para la temperatura y la ocasión de tu día.",
  },
];

const pasos = [
  {
    n: "01",
    titulo: "Sube tus prendas",
    descripcion:
      "Foto rápida desde el celular. StrandIA les quita el fondo y arma tu armario digital en minutos.",
    Visual: VisualRecorte,
  },
  {
    n: "02",
    titulo: "La IA combina por ti",
    descripcion:
      "Elige una ocasión o deja que improvise. Recibes outfits reales, armados solo con lo que ya tienes.",
    Visual: VisualCombina,
  },
  {
    n: "03",
    titulo: "Usa el look y repite",
    descripcion:
      "Guarda tus favoritos, registra qué usaste y descubre las prendas olvidadas que merecen otra salida.",
    Visual: VisualRotacion,
  },
];
export default function LandingContent() {
  return (
    <SmoothScroll>
      <main className="flex flex-1 flex-col">
        {/* ── Nav ──────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-divider bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
          <Container size="lg" className="flex items-center justify-between gap-3 py-2.5">
            <Link
              href="/"
              className="flex min-h-11 items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              aria-label="StrandIA — inicio"
            >
              <Image
                src="/logo-strandia.png"
                alt="StrandIA"
                width={160}
                height={80}
                className="h-9 w-auto sm:h-10"
                priority
              />
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-text active:bg-surface-offset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="hidden min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md active:translate-y-0 active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:inline-flex"
              >
                Crear cuenta
              </Link>
            </div>
          </Container>
        </header>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(150deg, #2d312e 0%, #435243 45%, #516351 100%)",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-primary-mid/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-32 -left-24 -z-10 h-80 w-80 rounded-full bg-primary/30 blur-3xl"
          />
          <Container size="lg" className="py-20 sm:py-24 lg:py-32">
            <LandingHero />
          </Container>
        </section>

        {/* ── Cómo funciona ────────────────────────────────────────────── */}
        <section id="como-funciona" className="scroll-mt-20 bg-bg">
          <Container size="lg" className="py-20 sm:py-28">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl tracking-tight text-text text-balance sm:text-4xl lg:text-5xl">
                Tres pasos. Cero &ldquo;no tengo qué ponerme&rdquo;.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base text-text-muted">
                De un armario lleno a un outfit decidido en menos de lo que
                tardas en desayunar.
              </p>
            </Reveal>

            <div className="mt-16 flex flex-col gap-16 sm:gap-24">
              {pasos.map((paso, i) => (
                <Reveal
                  key={paso.n}
                  className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
                    i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  {/* Demostración del paso */}
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-border sm:aspect-[16/10] lg:aspect-[4/3]">
                    <paso.Visual />
                  </div>
                  {/* Texto */}
                  <div className="lg:px-4">
                    <span className="font-display text-5xl text-primary-mid sm:text-6xl">
                      {paso.n}
                    </span>
                    <h3 className="mt-3 font-display text-2xl text-text sm:text-3xl">
                      {paso.titulo}
                    </h3>
                    <p className="mt-3 max-w-md text-base leading-relaxed text-text-muted">
                      {paso.descripcion}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── Banda editorial full-bleed ───────────────────────────────
            Era una foto de Unsplash a sangre con un degradado encima para
            poder leer el texto. Ese scrim es una apuesta: el contraste depende
            de qué tan clara sea la foto justo debajo de cada línea.

            Ahora el fondo es tinta con un degradado cálido —contraste medido y
            constante: 13,2:1 en la zona tinta, 7,8:1 en el punto más claro— y
            la fotografía pasa a ser una lámina contenida.

            Lo que va en la lámina es el Style Journal de la propia app: el
            spread de "Look del día" con sus prendas colgadas. Antes había una
            foto de una camiseta sobre una cama — real, pero muda. Esta enseña
            la pantalla que el usuario va a recibir.

            La proporción de la lámina se fija a la del archivo (1074/1358) en
            vez de a un 3/4 redondo: es una página con texto pequeño y
            recortarla o dejarle franjas se nota. */}
        <section className="relative isolate overflow-hidden bg-ink">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(115% 95% at 12% 0%, #4a5548 0%, #2d312e 55%, #242724 100%)",
            }}
          />
          {/* Halo cálido en lino: es lo que evita que el bloque se lea como un
              rectángulo negro plano. */}
          <div
            aria-hidden="true"
            className="absolute -right-20 top-1/2 -z-10 h-96 w-96 -translate-y-1/2 rounded-full bg-surface-offset/10 blur-3xl"
          />
          {/* Trama diagonal finísima: textura editorial sin archivo de ruido. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 opacity-[0.06]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, #fcf9f6 0 1px, transparent 1px 7px)",
            }}
          />

          <Container size="lg" className="py-20 sm:py-24 lg:py-28">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <Reveal>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-mid">
                  Outfit del día
                </p>
                <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
                  Un look nuevo cada mañana, hecho con la ropa que ya está en tu
                  clóset.
                </h2>
                <p className="mt-5 max-w-md text-base leading-relaxed text-white/85">
                  Nada de vitrinas infinitas ni compras por impulso. StrandIA
                  mira tu armario real y te propone algo que de verdad puedes
                  ponerte hoy.
                </p>
              </Reveal>

              <Reveal delay={120}>
                <div className="relative mx-auto aspect-[1074/1358] w-full max-w-[21rem] overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/15 lg:mr-0 lg:max-w-[26rem]">
                  <Image
                    src="/landing/style-journal.png"
                    alt="Página del Style Journal de StrandIA: el look del día con camiseta negra, pantalón cargo verde, tenis, chaqueta de cuadros y gorra, cada prenda colgada de una percha"
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 85vw, 416px"
                    className="object-contain"
                  />
                </div>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* ── Por qué StrandIA ─────────────────────────────────────────── */}
        <section className="bg-surface-offset">
          <Container size="lg" className="py-20 sm:py-24">
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
              <Reveal className="h-full rounded-2xl border border-border/60 bg-surface p-6 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-8">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21v-8" />
                    <path d="M12 13c0-3.5-2.5-6-6-6H4c0 3.5 2.5 6 6 6h2Z" />
                    <path d="M12 11c0-2.8 2-4.8 4.8-4.8H20c0 2.8-2 4.8-4.8 4.8H12Z" />
                  </svg>
                </span>
                <h3 className="mt-5 font-display text-2xl text-text">
                  Menos consumo, más estilo
                </h3>
                <p className="mt-3 text-base leading-relaxed text-text-muted">
                  Aprovechar lo que ya tienes es la forma más sostenible —y más
                  económica— de vestir bien. StrandIA te ayuda a comprar solo lo
                  que de verdad te suma.
                </p>
              </Reveal>
              <Reveal
                delay={120}
                className="h-full rounded-2xl border border-border/60 bg-surface p-6 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-8"
              >
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3c0 4.42-3.58 8-8 8 4.42 0 8 3.58 8 8 0-4.42 3.58-8 8-8-4.42 0-8-3.58-8-8Z" />
                  </svg>
                </span>
                <h3 className="mt-5 font-display text-2xl text-text">
                  Tu estilo, no un algoritmo genérico
                </h3>
                <p className="mt-3 text-base leading-relaxed text-text-muted">
                  Las combinaciones salen de tus prendas y tus ocasiones. Entre
                  más lo usas, mejor entiende cómo te gusta vestir.
                </p>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* ── Diseñado para resolver ───────────────────────────────────
            Capacidades del producto, no métricas de tracción. Ver el
            comentario sobre METRICAS antes de tocar las cifras. */}
        <section className="bg-bg">
          <Container size="lg" className="py-20 sm:py-24">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Diseñado para resolver
              </p>
              <h2 className="mt-4 font-display text-3xl tracking-tight text-text text-balance sm:text-4xl">
                Lo que cambia cuando dejas de improvisar
              </h2>
            </Reveal>

            {/* Barra de capacidades */}
            <Reveal delay={80} className="mt-12">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-9 rounded-2xl border border-border/60 bg-surface px-5 py-9 shadow-sm sm:grid-cols-4 sm:gap-x-6 sm:px-8">
                {METRICAS.map((m) => (
                  // `flex-col-reverse` para que el orden del DOM sea el que
                  // pide un <dl> (término y luego descripción) y el orden
                  // visual sea el que pide la lectura (cifra y luego etiqueta).
                  // `justify-end`: en column-reverse el eje va de abajo hacia
                  // arriba, así que el default apelmaza contra el borde
                  // inferior y descuadra las cifras entre sí.
                  <div
                    key={m.label}
                    className="flex flex-col-reverse items-center justify-end text-center"
                  >
                    <dt className="mt-2 px-1 text-xs leading-snug text-text-muted sm:text-sm">
                      {m.label}
                    </dt>
                    <dd className="font-display text-3xl leading-none tabular-nums text-primary sm:text-4xl">
                      {m.escalaGlifo ? (
                        <span
                          className="inline-block"
                          style={{ transform: `scale(${m.escalaGlifo})` }}
                        >
                          {m.valor}
                        </span>
                      ) : (
                        m.valor
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            {/* Pilares */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PILARES.map((pilar, i) => (
                <Reveal
                  key={pilar.titulo}
                  as="article"
                  delay={120 + i * 90}
                  className="flex h-full flex-col rounded-2xl border border-border/60 bg-surface p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  {/* Filete en vez de icono: las tarjetas de "Por qué StrandIA"
                      justo arriba ya llevan icono, y repetirlo aplanaba las dos
                      secciones en una sola textura. */}
                  <span aria-hidden="true" className="h-1 w-10 rounded-full bg-primary-mid" />
                  <h3 className="mt-5 font-display text-xl text-text">
                    {pilar.titulo}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-text-muted">
                    {pilar.texto}
                  </p>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── CTA final (bookend oscuro) ───────────────────────────────── */}
        <section className="relative overflow-hidden bg-ink">
          <div
            aria-hidden="true"
            className="absolute -bottom-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl"
          />
          <Container size="md" className="py-24 text-center sm:py-32">
            <Reveal>
              <h2 className="mx-auto max-w-2xl font-display text-4xl leading-tight tracking-tight text-white text-balance sm:text-5xl">
                ¿Vemos qué esconde tu armario?
              </h2>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/80">
                Crea tu cuenta gratis y arma tu primer outfit con IA en unos
                minutos.
              </p>
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/register"
                  className="inline-flex h-13 w-full items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-ink shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
                >
                  Crear cuenta gratis
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-13 w-full items-center justify-center rounded-full border border-white/40 px-7 text-base font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/10 hover:shadow-md active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </Reveal>
          </Container>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="bg-bg">
          <Container
            size="lg"
            className="flex flex-col items-center justify-between gap-3 py-8 text-center sm:flex-row sm:text-left"
          >
            <div className="flex items-center">
              <Image
                src="/logo-strandia.png"
                alt="StrandIA"
                width={140}
                height={70}
                className="h-8 w-auto"
              />
            </div>
            <p className="text-xs text-text-muted">
              Tu armario digital con IA · {new Date().getFullYear()}
            </p>
          </Container>
        </footer>
      </main>
    </SmoothScroll>
  );
}
