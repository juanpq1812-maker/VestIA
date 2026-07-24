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
  // ("BigInt is not a function" al recolectar page data). Server-only: se
  // resuelve desde node_modules en runtime.
  //
  // NO agregamos aquí "onnxruntime-node" ni "@imgly/background-removal-node":
  // onnxruntime-node YA viene en la lista por defecto de Next.js
  // (server-external-packages.jsonc) — agregarlo de nuevo es un no-op.
  // @imgly/background-removal-node SÍ lo probamos como external y reventó el
  // límite de función de Vercel (529.56MB vs 250MB, verificado en un deploy
  // real): al marcarlo external, Next no puede tracear finamente sus
  // requires y termina copiando su árbol de node_modules completo (incluye
  // un `sharp` nativo duplicado, node_modules/@imgly/.../node_modules/sharp,
  // ~24MB solo esa copia, más lo que arrastre por asociación). Dejarlo
  // bundleable (comportamiento por defecto) resuelve el tamaño — es JS puro,
  // solo onnxruntime-node adentro es nativo, y ese ya es external por
  // default.
  serverExternalPackages: ["node-ical"],
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
  // onnxruntime-node ya es external por defecto en Next (no bundleado), pero
  // eso NO garantiza que el tracer copie el .so nativo al output de la
  // función — ese archivo se carga vía dlopen() desde dentro del addon
  // .node, no vía require()/import(), así que el tracer estático de Next
  // nunca lo descubre solo. Sin este include explícito, el .node viaja pero
  // su .so hermano no — y falla en runtime con "cannot open shared object
  // file" (bug real visto en producción, confirmado en logs de Vercel de
  // las tres rutas de subida).
  //
  // OJO: el glob apunta a los archivos exactos, NO a todo el directorio
  // linux/x64/**/* — verificado con VERCEL_ANALYZE_BUILD_OUTPUT=1 en un
  // deploy real: ese directorio en Linux trae también los providers de GPU
  // de onnxruntime (CUDA/TensorRT/DNNL) que no existen en el build de Mac,
  // ~477MB que no usamos (Vercel no tiene GPU, model='small' corre en CPU).
  // Solo necesitamos el addon nativo y la lib core.
  outputFileTracingIncludes: Object.fromEntries(
    IMGLY_ROUTES.map((route) => [
      route,
      [
        "node_modules/onnxruntime-node/bin/napi-v3/linux/x64/onnxruntime_binding.node",
        "node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime.so*",
      ],
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
