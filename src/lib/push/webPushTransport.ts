// Transporte Web Push (protocolo estandar, libreria `web-push`). Es EL
// UNICO lugar del proyecto que importa `web-push` y lee las llaves VAPID
// privadas — "server-only" evita que Next.js lo incluya por error en un
// bundle de cliente.
//
// Este archivo solo sabe ENTREGAR un payload a una suscripcion dada. No
// decide a quien ni cuando mandar (eso vive en la Edge Function del
// prompt 3) — lo llama deliverNotification.ts.

import "server-only";
import webpush from "web-push";
import { getVapidEnv } from "./env";
import type { DeliveryResult, PushPayload, PushSubscriptionRecord } from "./types";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const { publicKey, privateKey, subject } = getVapidEnv();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export async function sendWebPush(
  subscription: PushSubscriptionRecord,
  payload: PushPayload
): Promise<DeliveryResult> {
  ensureVapidConfigured();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? (error as { statusCode?: number }).statusCode
        : undefined;

    if (statusCode === 404 || statusCode === 410) {
      return { ok: false, reason: "gone", statusCode };
    }

    return {
      ok: false,
      reason: "error",
      statusCode,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
