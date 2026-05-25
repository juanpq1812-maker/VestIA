// Pagina de Login (/login) — rediseño StrandIA.
//
// Diseño: pantalla full-screen con gradiente oscuro como único fondo.
// Logo + tagline centrados en la parte superior, formulario con campos
// semitransparentes sobre el mismo fondo oscuro.
//
// Breakpoints:
//   mobile  (default) : max-w-sm  · logo text-5xl · py-12 px-6
//   tablet  (md 768+) : max-w-md  · logo text-6xl · py-16 px-8
//   desktop (lg 1024+): max-w-lg  · logo text-7xl · py-20 px-12
//
// Lógica de auth (Supabase signInWithPassword) completamente intacta.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useId, type FormEvent } from "react";
import type { InputHTMLAttributes } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import Button from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Campo de formulario con estilos semitransparentes sobre fondo oscuro.
// Se define localmente porque el <Input> global usa estilos de modo claro
// que no son compatibles con este diseño específico.
// ---------------------------------------------------------------------------
function DarkField({
  label,
  error,
  id: idProp,
  className,
  ...rest
}: { label: string; error?: string | null } & InputHTMLAttributes<HTMLInputElement>) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-[#FAF0E6]/80">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={errorId}
        className={[
          "w-full rounded-lg border px-4 py-3 text-base text-white",
          "bg-white/10 placeholder:text-white/30 backdrop-blur-sm",
          "transition-colors duration-150 focus:outline-none focus:ring-2",
          error
            ? "border-red-400/50 focus:border-red-400/60 focus:ring-red-400/20"
            : "border-white/20 focus:border-[#8B9E8A]/70 focus:ring-[#8B9E8A]/25",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // Supabase devuelve mensajes en inglés; los traducimos al español.
      const mensaje =
        signInError.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : signInError.message;
      setError(mensaje);
      setCargando(false);
      return;
    }

    // router.refresh() fuerza a Next.js a re-ejecutar los Server Components
    // para que las páginas protegidas vean la sesión nueva de inmediato.
    router.push("/");
    router.refresh();
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-12 md:px-8 md:py-16 lg:px-12 lg:py-20"
      style={{
        background:
          "linear-gradient(180deg, #1a1f1a 0%, #2d312e 60%, #3a4a39 100%)",
      }}
    >
      {/* Contenedor centrado — se ensancha en tablet y desktop */}
      <div className="w-full max-w-sm md:max-w-md lg:max-w-lg">

        {/* ── Marca ─────────────────────────────────────────────────────── */}
        <div className="mb-10 text-center md:mb-12 lg:mb-14">
          <h1
            className="font-display font-normal tracking-tight text-[#FAF0E6]
                       text-5xl md:text-6xl lg:text-7xl"
          >
            StrandIA
          </h1>
          <p className="mt-3 font-sans text-base text-white/60 md:text-lg">
            Tu armario inteligente
          </p>
        </div>

        {/* ── Formulario ────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <DarkField
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />

          <DarkField
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            error={error}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={cargando}
            loadingText="Iniciando sesión…"
            className="mt-1"
          >
            Iniciar sesión
          </Button>
        </form>

        {/* ── Links secundarios ─────────────────────────────────────────── */}
        <div className="mt-6 flex flex-col items-center gap-3 text-sm">
          <Link
            href="/forgot-password"
            className="text-white/60 transition-colors hover:text-white"
          >
            ¿Olvidaste tu contraseña?
          </Link>

          <p className="text-white/60">
            ¿No tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#FAF0E6] underline-offset-4 hover:underline"
            >
              Crear cuenta
            </Link>
          </p>

          <Link
            href="/"
            className="text-white/60 transition-colors hover:text-white"
          >
            Continuar sin cuenta
          </Link>
        </div>

        {/* ── Footer legal ──────────────────────────────────────────────── */}
        <p className="mt-10 text-center text-xs leading-relaxed text-white/30">
          Al continuar, aceptas nuestros{" "}
          <Link
            href="/terms"
            className="underline underline-offset-2 transition-colors hover:text-white/50"
          >
            Términos de servicio
          </Link>{" "}
          y{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 transition-colors hover:text-white/50"
          >
            Política de privacidad
          </Link>
          .
        </p>

      </div>
    </main>
  );
}
