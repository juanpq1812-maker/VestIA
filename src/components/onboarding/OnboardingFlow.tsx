// Flujo de onboarding multi-paso (Client Component).
//
// Seis pantallas, una a la vez, con una transicion suave entre pasos:
//   1. Bienvenida + nombre del usuario (obligatorio)
//   2. Genero (obligatorio) — corrige el trato de genero en el resto de la app
//   3. Estilo (tarjetas visuales multi-select, minimo 1)
//   4. Ocasiones favoritas (chips multi-select, minimo 1)
//   5. Tallas (top, bottom, calzado)
//   6. Medidas opcionales (con boton "Saltar")
//   7. Autorizacion de fotos de cuerpo entero (opcional, con boton "Saltar")
//
// El estado vive en este componente; al final del paso 7 llama a la Server
// Action `saveOnboarding` y, si todo sale bien, redirige a /wardrobe.
//
// EL PASO 7 NO BLOQUEA. Es una autorizacion, no un requisito: quien la salte
// termina el onboarding igual y usa la app completa salvo el modo "outfit
// completo", que se la pedira cuando la necesite (BodyPhotoConsentModal). Por
// eso es un acto afirmativo separado del consentimiento del registro y no un
// paso obligatorio mas.

"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import Input from "@/components/ui/Input";
import Chip from "./Chip";
import StyleCard from "./StyleCard";
import {
  STYLE_TAGS,
  getStyleTagImage,
  OCCASION_TAGS,
  TOP_SIZES,
  BOTTOM_SIZES,
  GENDER_OPTIONS,
  type Gender,
} from "@/types/database";
import { saveOnboarding } from "@/app/onboarding/actions";
import BodyPhotoConsentFields from "@/components/legal/BodyPhotoConsentFields";

const TOTAL_PASOS = 7;

type Medidas = {
  chestCm: string;
  waistCm: string;
  hipCm: string;
};

const NOMBRE_MIN = 2;
const NOMBRE_MAX = 30;
// Letras (incluyendo acentos y eñe), espacios, apostrofes y guiones.
const NOMBRE_REGEX = /^[\p{L}][\p{L} '\-]*$/u;

function validarNombre(value: string): string | null {
  const limpio = value.trim();
  if (limpio.length < NOMBRE_MIN) {
    return `Tu nombre debe tener al menos ${NOMBRE_MIN} caracteres.`;
  }
  if (limpio.length > NOMBRE_MAX) {
    return `Tu nombre no puede pasar de ${NOMBRE_MAX} caracteres.`;
  }
  if (!NOMBRE_REGEX.test(limpio)) {
    return "Usa solo letras, espacios, apostrofes o guiones.";
  }
  return null;
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function parseNumber(value: string): number | null {
  const n = Number(value);
  return value.trim() === "" || Number.isNaN(n) ? null : n;
}

export default function OnboardingFlow() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState("");
  const [genero, setGenero] = useState<Gender | "">("");
  const [estilos, setEstilos] = useState<string[]>([]);
  const [ocasiones, setOcasiones] = useState<string[]>([]);
  const [topSize, setTopSize] = useState<string>("");
  const [bottomSize, setBottomSize] = useState<string>("");
  const [shoeSize, setShoeSize] = useState<string>("");
  const [medidas, setMedidas] = useState<Medidas>({
    chestCm: "",
    waistCm: "",
    hipCm: "",
  });
  const [autorizaFotoCuerpo, setAutorizaFotoCuerpo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function siguiente() {
    setError(null);
    if (paso === 1) {
      const errorNombre = validarNombre(nombre);
      if (errorNombre) {
        setError(errorNombre);
        return;
      }
    }
    if (paso === 2 && !genero) {
      setError("Elige una opción para continuar.");
      return;
    }
    if (paso === 3 && estilos.length === 0) {
      setError("Elige al menos un estilo.");
      return;
    }
    if (paso === 4 && ocasiones.length === 0) {
      setError("Elige al menos una ocasión.");
      return;
    }
    if (paso < TOTAL_PASOS) {
      setPaso((p) => p + 1);
    }
  }

  function atras() {
    setError(null);
    if (paso > 1) setPaso((p) => p - 1);
  }

  function finalizar(autorizaFoto: boolean) {
    setError(null);
    const errorNombre = validarNombre(nombre);
    if (errorNombre) {
      setError(errorNombre);
      setPaso(1);
      return;
    }
    if (!genero) {
      setError("Elige una opción de género.");
      setPaso(2);
      return;
    }
    const payload = {
      displayName: nombre.trim(),
      gender: genero,
      styleTags: estilos,
      favoriteOccasions: ocasiones,
      topSize: topSize || null,
      bottomSize: bottomSize || null,
      shoeSize: parseNumber(shoeSize),
      chestCm: parseNumber(medidas.chestCm),
      waistCm: parseNumber(medidas.waistCm),
      hipCm: parseNumber(medidas.hipCm),
      // Solo `true` deja constancia; saltar el paso no escribe nada (no
      // registramos "dijo que no", solo lo que autorizó).
      bodyPhotoConsent: autorizaFoto,
    };

    startTransition(async () => {
      const result = await saveOnboarding(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Refresca para que el Proxy y el Server Component del armario vean
      // `onboarding_completed = true`.
      router.push("/");
      router.refresh();
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center py-10 sm:py-16">
      <Container size="md">
        <ProgressBar paso={paso} total={TOTAL_PASOS} />

        <Card padding="lg" className="mt-6">
          {/* Wrapper con animacion de entrada por paso. */}
          <div
            key={paso}
            className="motion-safe:animate-[onboarding-fade_240ms_ease-out]"
          >
            {paso === 1 && (
              <PasoBienvenida
                nombre={nombre}
                onNombreChange={(v) => {
                  setNombre(v);
                  if (error) setError(null);
                }}
              />
            )}
            {paso === 2 && (
              <PasoGenero genero={genero} onChange={setGenero} />
            )}
            {paso === 3 && (
              <PasoEstilo
                genero={genero || null}
                seleccionadas={estilos}
                onToggle={(v) => setEstilos((arr) => toggle(arr, v))}
              />
            )}
            {paso === 4 && (
              <PasoChips
                titulo="¿Para qué ocasiones te vistes más seguido?"
                subtitulo="Esto define qué outfits te vamos a generar primero."
                opciones={[...OCCASION_TAGS]}
                seleccionadas={ocasiones}
                onToggle={(v) => setOcasiones((arr) => toggle(arr, v))}
              />
            )}
            {paso === 5 && (
              <PasoTallas
                topSize={topSize}
                bottomSize={bottomSize}
                shoeSize={shoeSize}
                onTopChange={setTopSize}
                onBottomChange={setBottomSize}
                onShoeChange={setShoeSize}
              />
            )}
            {paso === 6 && (
              <PasoMedidas medidas={medidas} onChange={setMedidas} />
            )}
            {paso === 7 && (
              <PasoFotoCuerpo
                autoriza={autorizaFotoCuerpo}
                onChange={setAutorizaFotoCuerpo}
                disabled={isPending}
              />
            )}
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-6 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
            >
              {error}
            </p>
          ) : null}

          {/* Botones */}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={atras}
              disabled={paso === 1 || isPending}
            >
              Atrás
            </Button>

            {paso === 6 ? (
              // Las medidas son opcionales: saltarlas las limpia y avanza.
              // `parseNumber("")` ya devuelve null, así que no hace falta
              // arrastrar un flag de "saltado" hasta el final.
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMedidas({ chestCm: "", waistCm: "", hipCm: "" });
                    siguiente();
                  }}
                  disabled={isPending}
                >
                  Saltar este paso
                </Button>
                <Button onClick={siguiente} disabled={isPending}>
                  Siguiente
                </Button>
              </div>
            ) : paso < TOTAL_PASOS ? (
              <Button onClick={siguiente} disabled={isPending}>
                Siguiente
              </Button>
            ) : (
              // Paso 7: la autorización nunca bloquea. "Saltar" termina sin
              // registrar nada; "Terminar" manda lo que diga la casilla.
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                <Button
                  variant="ghost"
                  onClick={() => finalizar(false)}
                  disabled={isPending}
                >
                  Saltar por ahora
                </Button>
                <Button
                  onClick={() => finalizar(autorizaFotoCuerpo)}
                  isLoading={isPending}
                  loadingText="Guardando…"
                >
                  Terminar
                </Button>
              </div>
            )}
          </div>
        </Card>
      </Container>

      {/* Keyframes locales — Tailwind v4 los detecta porque estan inline. */}
      <style>{`
        @keyframes onboarding-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Subcomponentes de cada paso. Los dejo en este mismo archivo por ahora para
// no fragmentar de mas; si el onboarding crece, los movemos a sus propios
// archivos.
// ---------------------------------------------------------------------------

function PasoFotoCuerpo({
  autoriza,
  onChange,
  disabled,
}: {
  autoriza: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-text sm:text-3xl">
        ¿Nos dejas leer tus fotos de cuerpo entero?
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Con el modo <strong className="text-text">Outfit completo</strong> subes
        una sola foto —una selfie de espejo, por ejemplo— y detectamos cada
        prenda por ti, en vez de subirlas una a una.
      </p>
      <p className="mt-2 text-sm text-text-muted">
        Como en esas fotos sales tú, te lo pedimos aparte. Es opcional: puedes
        saltarlo y seguir usando el resto de la app igual.
      </p>

      <div className="mt-6">
        <BodyPhotoConsentFields
          checked={autoriza}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function ProgressBar({ paso, total }: { paso: number; total: number }) {
  const pct = (paso / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Onboarding
        </p>
        <p className="text-xs text-text-muted">
          Paso {paso} de {total}
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-offset">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

type PasoBienvenidaProps = {
  nombre: string;
  onNombreChange: (v: string) => void;
};

function PasoBienvenida({ nombre, onNombreChange }: PasoBienvenidaProps) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
          <path d="M4 6v14a2 2 0 0 0 2 2h14v-4" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold text-text sm:text-4xl">
        Hola 👋, vamos a armar tu primer outfit
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-base text-text-muted">
        Para tu primer outfit solo necesitas{" "}
        <strong>6 prendas</strong>: 2 tops + 2 bottoms + 1 zapato +
        1 accesorio.{" "}
        <span className="text-primary font-medium">
          ¡En 10 minutos tienes tu primer look generado por IA!
        </span>
      </p>
      <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
        Primero te hacemos unas preguntas rápidas (~2 min) para que los
        outfits encajen con tu estilo.
      </p>
      <div className="mx-auto mt-8 max-w-sm text-left">
        <Input
          label="¿Cómo te llamamos?"
          type="text"
          autoComplete="given-name"
          autoFocus
          required
          minLength={NOMBRE_MIN}
          maxLength={NOMBRE_MAX}
          value={nombre}
          onChange={(e) => onNombreChange(e.target.value)}
          placeholder="Juan, María, Sofía…"
          hint="Lo usaremos para saludarte dentro de la app."
        />
      </div>
    </div>
  );
}

type PasoGeneroProps = {
  genero: Gender | "";
  onChange: (v: Gender) => void;
};

function PasoGenero({ genero, onChange }: PasoGeneroProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-text sm:text-3xl">
        ¿Con qué género te identificas?
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Nos ayuda a tratarte correctamente en toda la app y a darle más contexto a la IA.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {GENDER_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            active={genero === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

type PasoEstiloProps = {
  genero: Gender | null;
  seleccionadas: string[];
  onToggle: (value: string) => void;
};

function PasoEstilo({ genero, seleccionadas, onToggle }: PasoEstiloProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-text sm:text-3xl">
        ¿Qué estilos te representan?
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Selecciona todos los que apliquen. Esto le ayuda a la IA a sugerirte
        combinaciones que de verdad te gusten.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STYLE_TAGS.map((tag) => (
          <StyleCard
            key={tag}
            label={tag}
            imageSrc={getStyleTagImage(tag, genero)}
            active={seleccionadas.includes(tag)}
            onClick={() => onToggle(tag)}
          />
        ))}
      </div>
      <p className="mt-4 text-xs text-text-muted">
        Seleccionadas:{" "}
        <span className="font-medium text-text">{seleccionadas.length}</span>
      </p>
    </div>
  );
}

type PasoChipsProps = {
  titulo: string;
  subtitulo: string;
  opciones: string[];
  seleccionadas: string[];
  onToggle: (value: string) => void;
};

function PasoChips({
  titulo,
  subtitulo,
  opciones,
  seleccionadas,
  onToggle,
}: PasoChipsProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-text sm:text-3xl">
        {titulo}
      </h2>
      <p className="mt-2 text-sm text-text-muted">{subtitulo}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {opciones.map((opt) => (
          <Chip
            key={opt}
            active={seleccionadas.includes(opt)}
            onClick={() => onToggle(opt)}
          >
            <span className="capitalize">{opt}</span>
          </Chip>
        ))}
      </div>
      <p className="mt-4 text-xs text-text-muted">
        Seleccionadas:{" "}
        <span className="font-medium text-text">{seleccionadas.length}</span>
      </p>
    </div>
  );
}

type SelectField = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder: string;
  hint?: string;
};

function Select({ label, value, onChange, options, placeholder, hint }: SelectField) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-border bg-surface px-4 py-3 text-base text-text transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
    </label>
  );
}

type PasoTallasProps = {
  topSize: string;
  bottomSize: string;
  shoeSize: string;
  onTopChange: (v: string) => void;
  onBottomChange: (v: string) => void;
  onShoeChange: (v: string) => void;
};

function PasoTallas({
  topSize,
  bottomSize,
  shoeSize,
  onTopChange,
  onBottomChange,
  onShoeChange,
}: PasoTallasProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-text sm:text-3xl">
        Tus tallas
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Las usamos para sugerirte combinaciones realistas y, más adelante,
        recomendarte prendas que te queden bien.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Select
          label="Top"
          value={topSize}
          onChange={onTopChange}
          options={TOP_SIZES}
          placeholder="Elige talla"
        />
        <Select
          label="Bottom"
          value={bottomSize}
          onChange={onBottomChange}
          options={BOTTOM_SIZES}
          placeholder="Elige talla"
        />
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text">
            Calzado (número)
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={20}
            max={55}
            step={0.5}
            value={shoeSize}
            onChange={(e) => onShoeChange(e.target.value)}
            placeholder="Ej: 40"
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-text-faint transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </label>
      </div>
    </div>
  );
}

type PasoMedidasProps = {
  medidas: Medidas;
  onChange: (m: Medidas) => void;
};

function PasoMedidas({ medidas, onChange }: PasoMedidasProps) {
  function update(field: keyof Medidas, v: string) {
    onChange({ ...medidas, [field]: v });
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-text sm:text-3xl">
        Medidas (opcional)
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Si nos compartes tus medidas en cm, podremos afinar todavía más las
        recomendaciones. Puedes saltarte este paso.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <MedidaInput
          label="Pecho (cm)"
          value={medidas.chestCm}
          onChange={(v) => update("chestCm", v)}
        />
        <MedidaInput
          label="Cintura (cm)"
          value={medidas.waistCm}
          onChange={(v) => update("waistCm", v)}
        />
        <MedidaInput
          label="Cadera (cm)"
          value={medidas.hipCm}
          onChange={(v) => update("hipCm", v)}
        />
      </div>
    </div>
  );
}

function MedidaInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): ReactNode {
  return (
    <Input
      label={label}
      type="number"
      inputMode="decimal"
      min={20}
      max={250}
      step={0.5}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Ej: 90"
    />
  );
}
