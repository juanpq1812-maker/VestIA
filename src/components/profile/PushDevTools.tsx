// Herramienta de desarrollo para verificar Web Push en un dispositivo real,
// visible solo para admins (mismo gate que useIsAdmin.ts usa en otras
// partes). Dos acciones:
//   - "Enviar notificación de prueba": llama a /api/push/test, que manda una
//     noti a las propias suscripciones activas del usuario.
//   - "Reiniciar prompt de notificaciones (dev)": limpia los flags de
//     localStorage del flujo de permiso y vuelve a disparar el modal, para
//     poder iterar sin tener que generar un outfit cada vez.
//
// No hay UI de produccion para esto todavia — cuando exista una pantalla
// real de "Notificaciones" en /profile (hoy marcada "Próximamente"), esto
// se puede mover ahi.

"use client";

import { useState } from "react";
import { useIsAdmin } from "@/lib/admin/useIsAdmin";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import { SHOW_EVENT } from "@/components/push/PushOptInFlow";

const FLAGS_TO_RESET = [
  "strandia_push_value_moment_seen",
  "strandia_push_permission_decided",
  "strandia_push_declined_at",
];

export default function PushDevTools() {
  const isAdmin = useIsAdmin();
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" } | null>(null);

  if (!isAdmin) return null;

  async function onEnviarPrueba() {
    setIsSending(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ msg: data.error ?? "No se pudo enviar la notificación", kind: "error" });
        return;
      }
      setToast({ msg: `Enviada a ${data.enviados}/${data.total} suscripciones`, kind: "success" });
    } finally {
      setIsSending(false);
    }
  }

  function onReiniciarPrompt() {
    FLAGS_TO_RESET.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // silencioso
      }
    });
    window.dispatchEvent(new Event(SHOW_EVENT));
    setToast({ msg: "Flags reiniciados — evaluando el modal de nuevo", kind: "success" });
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-text">Web Push (dev)</h2>
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-border bg-surface-2 p-5">
        <p className="text-xs text-text-muted">
          Solo visible para admins. Herramientas para verificar notificaciones push en un dispositivo real.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={onEnviarPrueba}
            isLoading={isSending}
            loadingText="Enviando..."
          >
            Enviar notificación de prueba
          </Button>
          <Button variant="ghost" onClick={onReiniciarPrompt} type="button">
            Reiniciar prompt de notificaciones (dev)
          </Button>
        </div>
      </div>

      {toast && <Toast message={toast.msg} kind={toast.kind} onDismiss={() => setToast(null)} />}
    </section>
  );
}
