// Boton "cuéntale a tus amigos" de la pantalla de lista de espera.
// Usa la Web Share API cuando existe (mobile) y cae a copiar el link al
// portapapeles en desktop.

"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";

const SHARE_URL = "https://strandia.fashion";
const SHARE_TEXT =
  "Estoy en la lista de espera de StrandIA — tu armario digital con IA. Únete:";

export default function ShareButton() {
  const [toast, setToast] = useState<{
    msg: string;
    kind: "success" | "error" | "info";
  } | null>(null);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "StrandIA",
          text: SHARE_TEXT,
          url: SHARE_URL,
        });
      } catch {
        // El usuario cerro el share sheet — no es un error.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
      setToast({ msg: "Link copiado — compártelo donde quieras", kind: "success" });
    } catch {
      setToast({ msg: "No pudimos copiar el link", kind: "error" });
    }
  }

  return (
    <>
      <Button
        size="lg"
        fullWidth
        onClick={handleShare}
        leftIcon={
          <span className="material-symbols-outlined text-[20px]">
            ios_share
          </span>
        }
      >
        Cuéntale a tus amigos
      </Button>
      {toast && (
        <Toast
          message={toast.msg}
          kind={toast.kind}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
