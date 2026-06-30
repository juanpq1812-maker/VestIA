"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import AuthShell from "@/components/layout/AuthShell";
import GoogleButton from "@/components/auth/GoogleButton";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Detecta el error que devuelve /auth/callback cuando falla el OAuth.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth") setOauthError(true);
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
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
      setFormError(mensaje);
      setCargando(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell
      eyebrow="Bienvenido de vuelta"
      brandTitle="Tu armario te está esperando."
      brandSubtitle="Entra a StrandIA y deja que la IA te combine outfits con la ropa que ya tienes."
    >
      <header>
        <h2 className="font-display text-3xl font-bold text-text sm:text-4xl">
          Inicia sesión
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Vuelve a tu armario digital.
        </p>
      </header>

      {/* Error de OAuth (viene de /auth/callback?error=oauth) */}
      {oauthError && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-danger-light px-4 py-3 text-sm text-danger"
        >
          No se pudo iniciar sesión con Google. Inténtalo de nuevo.
        </p>
      )}

      {/* Google OAuth */}
      <div className="mt-6">
        <GoogleButton />
      </div>

      {/* Separador */}
      <div className="relative my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-text-faint">
          o continúa con email
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Formulario email + contraseña */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Input
          label="Email"
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
          error={formError}
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={cargando}
          loadingText="Iniciando sesión…"
          className="mt-2"
        >
          Entrar
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-text-muted">
        ¿No tienes cuenta?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Regístrate
        </Link>
      </p>
    </AuthShell>
  );
}
