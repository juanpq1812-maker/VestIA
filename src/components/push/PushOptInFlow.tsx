// Orquestador central del flujo de suscripcion a Web Push. Montado una vez
// en el root layout (junto a ServiceWorkerRegistration). No renderiza nada
// hasta que un trigger le pide evaluar que mostrar.
//
// Dos flags de localStorage con roles DISTINTOS (importante no mezclarlos):
//   (a) VALUE_MOMENT_KEY — "ya vio el momento de valor" (genero su primer
//       outfit). Es el gate de CUANDO evaluar la primera vez.
//   (b) PERMISSION_DECIDED_KEY — "ya se disparo el prompt nativo del
//       navegador y hubo una decision (granted/denied)". Es el UNICO guard
//       que evita volver a mostrar el modal "ask". El hint "ios-install"
//       jamas toca este flag: en iOS el usuario ve el hint, instala, y solo
//       DESPUES puede conceder el permiso nativo — si el hint quemara este
//       guard, los usuarios de iPhone nunca llegarian a que se les pida.
//
// Triggers que disparan una evaluacion:
//   1. Evento "strandia:show-push-modal" (lo dispara OutfitGenerator.tsx la
//      primera vez que genera un outfit, y PushDevTools.tsx para iterar).
//   2. Montaje en modo standalone con permiso "default" — cubre el caso
//      critico de iOS: el usuario instalo la PWA despues de ver el hint y
//      reabre la app; ahi hay que re-ofrecer "ask" (respetando el cooldown).

"use client";

import { useCallback, useEffect, useState } from "react";
import PushPermissionModal, { type ModalVariant } from "./PushPermissionModal";
import { isPushSupported, subscribeToPush } from "@/lib/push/browserSubscribe";

export const SHOW_EVENT = "strandia:show-push-modal";
const VALUE_MOMENT_KEY = "strandia_push_value_moment_seen";
const PERMISSION_DECIDED_KEY = "strandia_push_permission_decided";
const DECLINED_AT_KEY = "strandia_push_declined_at";
const COOLDOWN_MS = 4 * 24 * 60 * 60 * 1000; // 4 dias antes de re-ofrecer tras "Ahora no"

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function onCooldown(): boolean {
  try {
    const raw = localStorage.getItem(DECLINED_AT_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markPermissionDecided() {
  try {
    localStorage.setItem(PERMISSION_DECIDED_KEY, "1");
  } catch {
    // localStorage puede fallar en modo privado — no bloqueamos el flujo.
  }
}

export default function PushOptInFlow() {
  const [variant, setVariant] = useState<ModalVariant | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const evaluate = useCallback(() => {
    if (isIOS() && !isStandalone()) {
      // Hint suave — nunca marca PERMISSION_DECIDED_KEY.
      setVariant("ios-install");
      return;
    }

    if (!isPushSupported()) return;

    const permission = Notification.permission;

    if (permission === "granted") {
      // Ya concedido: no volvemos a preguntar, solo garantizamos que la
      // suscripcion exista en el servidor (idempotente, sin UI).
      markPermissionDecided();
      subscribeToPush();
      return;
    }

    if (permission === "denied") {
      markPermissionDecided();
      setVariant("denied");
      return;
    }

    // permission === "default": no hay decision nativa todavia.
    try {
      if (localStorage.getItem(PERMISSION_DECIDED_KEY)) return;
    } catch {
      // seguimos igual si localStorage no esta disponible
    }
    if (onCooldown()) return;
    setVariant("ask");
  }, []);

  useEffect(() => {
    function onShow() {
      evaluate();
    }
    window.addEventListener(SHOW_EVENT, onShow);
    return () => window.removeEventListener(SHOW_EVENT, onShow);
  }, [evaluate]);

  // Caso critico iOS: reabrir la app ya instalada (standalone) con permiso
  // "default" re-ofrece el modal, sin depender de generar otro outfit.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isStandalone()) return;
    let vioMomentoDeValor = false;
    try {
      vioMomentoDeValor = Boolean(localStorage.getItem(VALUE_MOMENT_KEY));
    } catch {
      return;
    }
    if (!vioMomentoDeValor) return;
    if (!isPushSupported()) return;
    if (Notification.permission !== "default") return;
    // Disparamos el mismo evento que usan los demas triggers en vez de
    // llamar evaluate()/setVariant directo — evita setState sincronico
    // dentro del cuerpo del efecto (react-hooks/set-state-in-effect).
    window.dispatchEvent(new Event(SHOW_EVENT));
  }, []);

  async function onAceptar() {
    if (variant !== "ask") {
      // "denied"/"ios-install" solo tienen boton "Entendido".
      setVariant(null);
      return;
    }
    setIsRequesting(true);
    const result = await Notification.requestPermission();
    markPermissionDecided();
    setIsRequesting(false);
    setVariant(null);
    if (result === "granted") {
      await subscribeToPush();
    }
  }

  function onCerrar() {
    if (variant === "ask") {
      try {
        localStorage.setItem(DECLINED_AT_KEY, String(Date.now()));
      } catch {
        // silencioso
      }
    }
    setVariant(null);
  }

  if (!variant) return null;

  return (
    <PushPermissionModal
      variant={variant}
      isRequesting={isRequesting}
      onAceptar={onAceptar}
      onCerrar={onCerrar}
    />
  );
}

// Llamado desde OutfitGenerator.tsx tras el primer outfit generado con
// exito. Marca el momento de valor UNA sola vez y dispara la evaluacion.
export function triggerFirstOutfitValueMoment() {
  try {
    if (localStorage.getItem(VALUE_MOMENT_KEY)) return;
    localStorage.setItem(VALUE_MOMENT_KEY, "1");
  } catch {
    // si no hay localStorage, igual disparamos — sin persistencia de flag,
    // se re-evaluara en cada generacion, pero es un fallback aceptable.
  }
  window.dispatchEvent(new Event(SHOW_EVENT));
}
