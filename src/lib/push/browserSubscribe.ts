// Helpers de CLIENTE para suscribirse a Web Push. Sin "server-only" — este
// archivo corre en el navegador (usa `window`/`navigator`/PushManager).
//
// Separado de src/lib/push/env.ts (que sí es server-only y lee la llave
// VAPID PRIVADA): acá solo se lee NEXT_PUBLIC_VAPID_PUBLIC_KEY, que es
// pública por diseño.

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// El navegador espera la applicationServerKey como Uint8Array, pero la
// llave pública VAPID viaja como string base64url.
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; error: string };

// Registra el SW (si no lo estaba ya — ServiceWorkerRegistration.tsx lo hace
// en el layout, pero `.ready` espera a que esté listo si todavía no corrió),
// suscribe con PushManager, y persiste la suscripción en el servidor.
export async function subscribeToPush(): Promise<SubscribeResult> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return { ok: false, error: "Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en el cliente." };
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, error: "La suscripción del navegador no trajo las llaves esperadas." };
    }

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        userAgent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `El servidor rechazó la suscripción (${res.status}).` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
