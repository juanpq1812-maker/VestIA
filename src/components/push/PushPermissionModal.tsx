// Modal de suscripción a Web Push, con 3 variantes segun el estado del
// permiso (ver PushOptInFlow.tsx, que decide cual mostrar):
//
//   - "ask": el pedido con la voz de Hebri, disparado despues del primer
//     outfit generado. Solo si el usuario toca "Si, avisame" se llama al
//     Notification.requestPermission() nativo (nunca antes).
//   - "denied": el usuario ya bloqueo el permiso nativo — no podemos volver
//     a pedirlo por JS, solo explicar como activarlo a mano.
//   - "ios-install": en iPhone, Web Push no funciona fuera de una PWA
//     instalada. Hint suave con el mini-instructivo de "Compartir → Añadir
//     a inicio". Mostrar esto NUNCA cuenta como "ya se pidio el permiso".
//
// Mismo patron visual "bottom sheet en mobile, modal centrado en desktop"
// que OutfitUseDateModal.tsx (ver CLAUDE.md).

"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

export type ModalVariant = "ask" | "denied" | "ios-install";

type Props = {
  variant: ModalVariant;
  isRequesting?: boolean;
  onAceptar: () => void;
  onCerrar: () => void;
};

export default function PushPermissionModal({
  variant,
  isRequesting = false,
  onAceptar,
  onCerrar,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isRequesting) onCerrar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRequesting, onCerrar]);

  const content = CONTENT[variant];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-permission-modal-title"
      className="fixed inset-0 z-40 flex items-end justify-center bg-text/40 p-4 sm:items-center"
      style={{ animation: "fadeIn 160ms ease-out" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRequesting) onCerrar();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <header className="border-b border-border px-5 py-4">
          <h2
            id="push-permission-modal-title"
            className="font-display text-xl font-semibold text-text"
          >
            {content.titulo}
          </h2>
        </header>

        <div className="p-5">
          <p className="text-sm leading-relaxed text-text-muted">{content.cuerpo}</p>
          {variant === "ios-install" && <IosInstallSteps />}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
          {content.botonSecundario && (
            <Button variant="ghost" onClick={onCerrar} disabled={isRequesting} type="button">
              {content.botonSecundario}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={content.botonPrimario ? onAceptar : onCerrar}
            isLoading={isRequesting}
            loadingText="Un momento..."
            type="button"
          >
            {content.botonPrimario ?? "Entendido"}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function IosInstallSteps() {
  return (
    <ol className="mt-4 space-y-2 text-sm text-text">
      <li className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
          1
        </span>
        Toca el ícono de Compartir en Safari
      </li>
      <li className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
          2
        </span>
        Elige &ldquo;Añadir a inicio&rdquo;
      </li>
      <li className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
          3
        </span>
        Abre StrandIA desde el ícono nuevo
      </li>
    </ol>
  );
}

const CONTENT: Record<
  ModalVariant,
  {
    titulo: string;
    cuerpo: string;
    botonPrimario?: string;
    botonSecundario?: string;
  }
> = {
  ask: {
    titulo: "¿Quieres que Hebri te avise? 🧶",
    cuerpo:
      "Te mando un recordatorio cada mañana con tu outfit del día. Nada de spam, te lo prometo.",
    botonPrimario: "Sí, avísame",
    botonSecundario: "Ahora no",
  },
  denied: {
    titulo: "Las notificaciones están bloqueadas",
    cuerpo:
      "Bloqueaste los avisos de StrandIA en tu navegador. Puedes activarlos otra vez desde los ajustes del sitio (el ícono de candado o de información junto a la barra de direcciones).",
  },
  "ios-install": {
    titulo: "Instala StrandIA para recibir avisos",
    cuerpo:
      "En iPhone, las notificaciones solo funcionan si tienes StrandIA instalada en tu pantalla de inicio.",
  },
};
