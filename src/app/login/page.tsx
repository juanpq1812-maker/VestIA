// Pagina de Login (/login) — rediseño StrandIA.
//
// Layout mobile-first de pantalla completa con dos zonas:
//   1. Hero oscuro con marca (gradiente CSS en lugar de foto, reemplazar después).
//   2. Formulario sobre fondo crema con auth de Supabase intacta.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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
      const mensaje =
        signInError.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : signInError.message;
      setError(mensaje);
      setCargando(false);
      return;
    }

    // Fuerza re-ejecución de Server Components para que vean la sesión nueva.
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col">

      {/* ── ZONA 1: Hero ───────────────────────────────────────────────── */}
      <section
        className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
        style={{
          background:
            "linear-gradient(180deg, #1a1f1a 0%, #2d312e 60%, #3a4a39 100%)",
        }}
        aria-hidden="false"
      >
        {/* Wordmark */}
        <h1 className="font-display text-5xl font-normal tracking-tight text-white sm:text-6xl">
          StrandIA
        </h1>
        <p className="mt-3 font-sans text-base font-normal text-white/70 sm:text-lg">
          Tu armario inteligente
        </p>
      </section>

      {/* ── ZONA 2: Formulario ─────────────────────────────────────────── */}
      <section className="flex flex-col px-6 py-10 sm:px-8 sm:py-12"
        style={{ background: "#FAF0E6" }}
      >
        <div className="mx-auto w-full max-w-sm">

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
            noValidate
          >
            <Input
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />

            <Input
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

          {/* Links secundarios */}
          <div className="mt-6 flex flex-col items-center gap-3 text-sm">
            <Link
              href="/forgot-password"
              className="text-text-muted hover:text-text transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>

            <p className="text-text-muted">
              ¿No tienes cuenta?{" "}
              <Link
                href="/register"
                className="font-semibold text-text underline-offset-4 hover:underline"
              >
                Crear cuenta
              </Link>
            </p>

            <Link
              href="/"
              className="text-text-muted hover:text-text transition-colors"
            >
              Continuar sin cuenta
            </Link>
          </div>

          {/* Footer legal */}
          <p className="mt-8 text-center text-xs text-text-faint leading-relaxed">
            Al continuar, aceptas nuestros{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-text-muted transition-colors">
              Términos de servicio
            </Link>{" "}
            y{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-text-muted transition-colors">
              Política de privacidad
            </Link>
            .
          </p>

        </div>
      </section>

    </main>
  );
}
