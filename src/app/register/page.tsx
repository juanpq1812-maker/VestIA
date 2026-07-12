"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import AuthShell from "@/components/layout/AuthShell";
import GoogleButton from "@/components/auth/GoogleButton";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth") {
      setError("No se pudo registrar con Google. Inténtalo de nuevo.");
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

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

    // Los usuarios nuevos entran a la lista de espera; el Proxy los mantendra
    // ahi hasta que un admin los apruebe.
    router.push("/waitlist");
    router.refresh();
  }

  return (
    <AuthShell
      eyebrow="Crea tu cuenta"
      brandTitle="Empieza a digitalizar tu armario."
      brandSubtitle="Sube tus prendas, deja que la IA te combine outfits y descubre cuánto puedes aprovechar lo que ya tienes."
    >
      <header>
        <h2 className="font-display text-3xl font-bold text-text sm:text-4xl">
          Crea tu cuenta
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Empieza en menos de un minuto.
        </p>
      </header>

      {/* Error de OAuth */}
      {error && !cargando && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-danger-light px-4 py-3 text-sm text-danger"
        >
          {error}
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
          o regístrate con email
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
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          hint="Usa al menos 6 caracteres."
          error={cargando ? null : error}
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={cargando}
          loadingText="Creando cuenta…"
          className="mt-2"
        >
          Crear cuenta
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-text-faint">
        Al crear tu cuenta aceptas los{" "}
        <Link
          href="/terms"
          className="font-medium text-text-muted underline underline-offset-4 hover:text-primary"
        >
          Términos y Condiciones
        </Link>{" "}
        y la{" "}
        <Link
          href="/privacy-policy"
          className="font-medium text-text-muted underline underline-offset-4 hover:text-primary"
        >
          Política de Privacidad
        </Link>
        .
      </p>

      <p className="mt-8 text-center text-sm text-text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}
