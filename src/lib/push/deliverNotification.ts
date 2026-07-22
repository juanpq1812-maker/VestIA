// Capa de entrega desacoplada: UNA funcion generica que recibe una
// suscripcion + un payload y lo entrega. No decide audiencia, horario ni
// copy — esa logica vivira en la Edge Function del prompt 3, que va a
// importar `enviarNotificacion` sin conocer el transporte.
//
// "server-only" por la misma razon que webPushTransport.ts: esta funcion
// termina llamando al SDK de web-push con la llave privada VAPID.
//
// Transporte de hoy: Web Push (sendWebPush). El dia que se agregue un
// segundo transporte (FCM/APNs, cuando el proyecto migre a Capacitor para
// apps nativas), el cambio queda contenido aca adentro — por ejemplo
// eligiendo el transporte segun un campo `platform` en la suscripcion —
// sin que la Edge Function que decide a quien notificar tenga que cambiar.

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { sendWebPush } from "./webPushTransport";
import type { DeliveryResult, PushPayload, PushSubscriptionRecord } from "./types";

export async function enviarNotificacion(
  subscription: PushSubscriptionRecord,
  payload: PushPayload
): Promise<DeliveryResult> {
  // Punto de extension futuro: `if (subscription.platform === "fcm") return sendFcm(...)`.
  const result = await sendWebPush(subscription, payload);

  if (!result.ok && result.reason === "gone") {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .update({ active: false })
      .eq("id", subscription.id);

    if (error) {
      console.error(
        `[push] no se pudo marcar active=false para la suscripcion ${subscription.id}:`,
        error
      );
    }
  } else if (!result.ok) {
    console.error(
      `[push] fallo la entrega a la suscripcion ${subscription.id} (status ${result.statusCode ?? "?"}):`,
      result.message
    );
  }

  return result;
}
