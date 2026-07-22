// Tipos compartidos por la capa de entrega de push. Sin "server-only" aca:
// son solo tipos (se borran en compilacion), pero los archivos que los usan
// para hacer trabajo real de servidor si lo llevan.

export type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
};

export type DeliveryResult =
  | { ok: true }
  | { ok: false; reason: "gone"; statusCode: 404 | 410 }
  | { ok: false; reason: "error"; statusCode?: number; message: string };
