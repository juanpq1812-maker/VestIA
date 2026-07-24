import type { NextConfig } from "next";

const codespaceName = process.env.CODESPACE_NAME;
const codespaceDomain =
  process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? "app.github.dev";

const allowedOrigins = [
  "localhost:3000",
  "*.app.github.dev",
  ...(codespaceName ? [`${codespaceName}-3000.${codespaceDomain}`] : []),
  "strandia.fashion",
  "www.strandia.fashion",
  ...(process.env.VERCEL_URL ? [process.env.VERCEL_URL] : []),
];

const securityHeaders = [
  // Evita que la app se embeba en iframes (previene clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // El navegador no intenta adivinar el Content-Type de respuestas.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Cross-origin: solo envía el origen, sin path ni query params.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deshabilita APIs de hardware que la app no usa.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS solo en producción: fuerza HTTPS por 2 años.
  // En localhost/Codespaces (HTTP) este header rompe la navegación.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

// Rutas que llaman a @imgly/background-removal-node (vía
// finalizeGeminiImageOutput) — todo el pipeline de imagen de subida de
// prendas. `\\[id\\]` escapa los corchetes literales del segmento dinámico
// (picomatch los trata como character class si no se escapan) — mismo patrón
// que usa el ejemplo de la doc oficial de Next.js para rutas dinámicas.
const IMGLY_ROUTES = [
  "/wardrobe/upload",
  "/wardrobe/upload/review",
  "/wardrobe/\\[id\\]/edit",
];

const nextConfig: NextConfig = {
  // node-ical (parser del calendario) no sobrevive el bundling de Turbopack
  // ("BigInt is not a function" al recolectar page data). onnxruntime-node y
  // @imgly/background-removal-node: marcarlos externos evita que Turbopack
  // intente bundlear el addon nativo (.node) — se resuelven desde
  // node_modules en runtime, igual que node-ical.
  serverExternalPackages: ["node-ical", "onnxruntime-node", "@imgly/background-removal-node"],
  // onnxruntime-node trae binarios de 6 plataformas (~133MB).
  // `scripts/prune-imgly-assets.js` ya los poda a solo la plataforma/
  // arquitectura de la máquina que corre `npm install` (linux/x64 en el
  // build de Vercel) — esto es defensa adicional explícita, en caso de que
  // un futuro cambio en el pipeline de instalación (build cache restaurado
  // sin postinstall, etc.) deje alguna plataforma de más sin podar.
  outputFileTracingExcludes: Object.fromEntries(
    IMGLY_ROUTES.map((route) => [
      route,
      [
        "node_modules/onnxruntime-node/bin/napi-v3/darwin/**/*",
        "node_modules/onnxruntime-node/bin/napi-v3/win32/**/*",
        "node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**/*",
      ],
    ])
  ),
  // marcar el paquete como `serverExternalPackages` evita que Turbopack lo
  // bundlee, pero NO garantiza que el tracer copie el .so nativo al output
  // de la función — ese archivo se carga vía dlopen() desde dentro del
  // addon .node, no vía require()/import(), así que el tracer estático de
  // Next nunca lo descubre solo. Sin este include explícito, el .node viaja
  // pero su .so hermano no — y falla en runtime con "cannot open shared
  // object file" (bug real visto en producción, confirmado en logs de
  // Vercel de las tres rutas de subida).
  outputFileTracingIncludes: Object.fromEntries(
    IMGLY_ROUTES.map((route) => [
      route,
      ["node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*"],
    ])
  ),
  images: {
    // Fotografía editorial de la landing servida desde Unsplash.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  experimental: {
    serverActions: {
      allowedOrigins,
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
