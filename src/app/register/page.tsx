// Pagina de Registro (/register) — rediseño StrandIA.
//
// Mismo diseño que /login: pantalla full-screen con gradiente oscuro,
// logo en Libre Caslon hueso, campos semitransparentes sobre fondo oscuro.
//
// Breakpoints:
//   mobile  (default) : max-w-sm  · logo text-5xl · py-12 px-6
//   tablet  (md 768+) : max-w-md  · logo text-6xl · py-16 px-8
//   desktop (lg 1024+): max-w-lg  · logo text-7xl · py-20 px-12
//
// Lógica de registro (Supabase signUp, validaciones, router) completamente intacta.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useId, type FormEvent } from "react";
import type { InputHTMLAttributes } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import Button from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Campo de formulario con estilos semitransparentes sobre fondo oscuro.
// Copia local del componente usado en /login — el <Input> global usa estilos
// de modo claro que no son compatibles con este diseño específico.
// Soporta `hint` (texto de ayuda) además de `error`.
// ---------------------------------------------------------------------------
function DarkField({
  label,
  error,
  hint,
  id: idProp,
  className,
  ...rest
}: {
  label: string;
  error?: string | null;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const hintId  = hint  ? `${id}-hint`  : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-[#FAF0E6]/80">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
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
      {hint && !error ? (
        <p id={hintId} className="text-xs text-white/40">
          {hint}
        </p>
      ) : null}
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
export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Validación básica del lado del cliente. Supabase también valida en el servidor,
    // pero así le damos feedback rápido al usuario antes del request.
    const emailLimpio = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
      setError("Ingresa un email válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: emailLimpio,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setCargando(false);
      return;
    }

    // Confirmación de email deshabilitada en desarrollo → sesión activa
    // inmediatamente, mandamos al usuario al onboarding.
    router.push("/onboarding");
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
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            hint="Usa al menos 6 caracteres."
            error={error}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={cargando}
            loadingText="Creando cuenta…"
            className="mt-1"
          >
            Crear cuenta
          </Button>
        </form>

        {/* ── Link secundario ───────────────────────────────────────────── */}
        <div className="mt-6 flex flex-col items-center gap-3 text-sm">
          <p className="text-white/60">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#FAF0E6] underline-offset-4 hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
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
