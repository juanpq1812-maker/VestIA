// Pagina de Registro (/register).
//
// Es un Client Component porque maneja estado de formulario y llama a Supabase desde
// el navegador (el cliente del navegador escribe la cookie de sesion automaticamente
// si el registro es exitoso).

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import AuthShell from "@/components/layout/AuthShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Validacion basica del lado del cliente. Supabase tambien valida en el servidor,
    // pero asi le damos feedback rapido al usuario antes del request.
    const emailLimpio = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
      setError("Ingresá un email válido.");
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

    // Como en Supabase tienes deshabilitada la confirmacion por email para desarrollo,
    // el usuario queda con sesion activa inmediatamente y podemos mandarlo al onboarding.
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <AuthShell
      eyebrow="Crea tu cuenta"
      brandTitle="Empezá a digitalizar tu armario."
      brandSubtitle="Subí tus prendas, dejá que la IA te combine outfits y descubrí cuánto podés aprovechar lo que ya tenés."
    >
      <header>
        <h2 className="font-display text-3xl font-bold text-text sm:text-4xl">
          Crea tu cuenta
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Empezá en menos de un minuto.
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
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          hint="Usá al menos 6 caracteres."
          error={error}
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

      <p className="mt-8 text-center text-sm text-text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Iniciá sesión
        </Link>
      </p>
    </AuthShell>
  );
}
