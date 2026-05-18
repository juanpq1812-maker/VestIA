// Pagina de Login (/login).
//
// Client Component que usa el cliente de Supabase del navegador.
// Si el inicio de sesion es exitoso, redirigimos al armario.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import AuthShell from "@/components/layout/AuthShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      // Supabase devuelve un mensaje en ingles tipo "Invalid login credentials".
      // Lo traducimos al espanol para que sea mas claro para el usuario.
      const mensaje =
        signInError.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : signInError.message;
      setError(mensaje);
      setCargando(false);
      return;
    }

    // `router.refresh()` fuerza a Next.js a re-ejecutar los Server Components,
    // lo que asegura que el Proxy y las páginas protegidas vean ya la sesión nueva.
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

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
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
          error={error}
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
