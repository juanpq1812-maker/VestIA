// Helper para leer las variables de entorno de VAPID con un mensaje de error
// claro si alguien olvida configurarlas. Mismo patron que getSupabaseEnv().
//
// Las llaves se generan una sola vez con `npx web-push generate-vapid-keys`
// (ver instrucciones en el PR) — este archivo nunca las genera ni las
// hardcodea, solo las lee de env.

import "server-only";

export function getVapidEnv() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:strandia.fashion@gmail.com";

  if (!publicKey || !privateKey) {
    throw new Error(
      "Faltan las llaves VAPID. Genera un par con `npx web-push generate-vapid-keys` y pega NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en `.env.local` (y en Vercel para producción)."
    );
  }

  return { publicKey, privateKey, subject };
}
