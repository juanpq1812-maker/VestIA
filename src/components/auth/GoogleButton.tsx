// Botón "Continuar con Google" usando Google Identity Services (GIS).
//
// A diferencia del flujo OAuth clásico (signInWithOAuth → redirect al dominio
// de Supabase), GIS entrega el ID token directamente en strandia.fashion y lo
// pasamos a Supabase con signInWithIdToken(). Resultado: la pantalla de Google
// muestra "StrandIA" y nuestro dominio — el dominio técnico de Supabase
// desaparece del flujo visible.
//
// Seguridad: generamos un nonce por sesión de botón; GIS recibe el SHA-256
// del nonce y Supabase recibe el nonce crudo — Supabase verifica que el hash
// dentro del ID token coincida (por eso "Skip nonce checks" queda apagado).

"use client";

import { useCallback, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

// El client ID de OAuth es un identificador público por diseño (viaja en cada
// request del navegador). Se puede sobreescribir por env para otros entornos.
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
  "120491872282-f371qct2vg8n0v1cfg3n1oq86knc0p11.apps.googleusercontent.com";

type CredentialResponse = { credential: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: CredentialResponse) => void;
            nonce?: string;
            use_fedcm_for_prompt?: boolean;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
              locale?: string;
            }
          ): void;
        };
      };
    };
  }
}

/** Nonce crudo (para Supabase) + su SHA-256 en hex (para GIS). */
async function generarNonce(): Promise<{ nonce: string; hashed: string }> {
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
  );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(nonce)
  );
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { nonce, hashed };
}

export default function GoogleButton() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef<string | null>(null);
  const [gisListo, setGisListo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manejarCredencial = useCallback(
    async (response: CredentialResponse) => {
      setProcesando(true);
      setError(null);

      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        nonce: nonceRef.current ?? undefined,
      });

      if (authError) {
        setProcesando(false);
        setError("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
        return;
      }

      // Replicamos la lógica del callback OAuth: waitlist → onboarding → app.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("approved, onboarding_completed")
        .eq("id", user?.id ?? "")
        .maybeSingle();

      const destino = !profile?.approved
        ? "/waitlist"
        : !profile.onboarding_completed
          ? "/onboarding"
          : "/";
      router.push(destino);
      router.refresh();
    },
    [router]
  );

  const inicializarGis = useCallback(async () => {
    if (!window.google || !containerRef.current) return;

    const { nonce, hashed } = await generarNonce();
    nonceRef.current = nonce;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: manejarCredencial,
      nonce: hashed,
      use_fedcm_for_prompt: true,
    });

    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      logo_alignment: "center",
      width: Math.min(containerRef.current.offsetWidth || 400, 400),
      locale: "es",
    });
    setGisListo(true);
  }, [manejarCredencial]);

  return (
    <div>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => {
          void inicializarGis();
        }}
      />

      {/* El div del ref es propiedad exclusiva de Google (renderButton muta su
          DOM); React nunca debe renderizar hijos ahí dentro. El skeleton vive
          como hermano y se oculta cuando GIS termina. */}
      <div className="relative min-h-[44px] w-full" aria-busy={procesando}>
        <div ref={containerRef} className="flex w-full justify-center" />
        {!gisListo && (
          <div
            className="absolute inset-0 mx-auto h-11 w-full max-w-[400px] animate-pulse rounded-full bg-surface-2"
            aria-hidden="true"
          />
        )}
      </div>

      {procesando && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 flex items-center justify-center gap-2 text-sm text-text-muted"
        >
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden="true"
          />
          Iniciando sesión…
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md bg-danger-light px-3 py-2 text-center text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
