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

// Identificador único de este despliegue. Lo usan DOS cosas:
//
//   1. El nombre de caché del service worker (vía NEXT_PUBLIC_BUILD_ID), para
//      que `activate` limpie la caché del deploy anterior. Antes era la
//      cadena fija "strandia-v2" y nunca se limpiaba nada.
//   2. `deploymentId` de Next, para protección de version skew (abajo).
//
// El orden de preferencia importa: VERCEL_DEPLOYMENT_ID es único por
// despliegue, mientras que el SHA del commit se repite si se redespliega el
// mismo commit. En local, un timestamp por build para no arrastrar caché
// entre pruebas.
const BUILD_ID =
  process.env.VERCEL_DEPLOYMENT_ID ??
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  `dev-${Date.now().toString(36)}`;

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
  // Se inyecta en el bundle del cliente para poder registrar el SW con
  // `?v=<build>` y que el navegador lo trate como script nuevo.
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },

  // Protección de version skew.
  //
  // Cierra la ventana que el arreglo del service worker no podía cerrar: un
  // cliente que YA tiene la app abierta cuando sale un despliegue nuevo. Sus
  // chunks de /_next/static desaparecen del servidor y la navegación siguiente
  // falla.
  //
  // Con esto, Next marca los assets con `?dpl=<id>`, manda `x-deployment-id`
  // en las navegaciones de cliente, y cuando el servidor detecta que no
  // coincide con el suyo fuerza una recarga completa en vez de una navegación
  // de cliente. El usuario aterriza en la versión nueva en lugar de ver un 404.
  //
  // OJO con lo que esto NO hace: no conserva los assets viejos. Eso es la
  // Skew Protection de Vercel, que se activa en el dashboard del proyecto y es
  // complementaria — sin ella el cliente se recarga (se pierde el estado de
  // `useState`), con ella puede terminar su sesión contra el deploy anterior.
  deploymentId: BUILD_ID,

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
