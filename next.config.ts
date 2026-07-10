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

const nextConfig: NextConfig = {
  // node-ical (parser del calendario) no sobrevive el bundling de Turbopack
  // ("BigInt is not a function" al recolectar page data). Server-only: se
  // resuelve desde node_modules en runtime.
  serverExternalPackages: ["node-ical"],
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
