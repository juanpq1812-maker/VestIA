import type { NextConfig } from "next";

const codespaceName = process.env.CODESPACE_NAME;
const codespaceDomain =
  process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? "app.github.dev";

const allowedOrigins = [
  "localhost:3000",
  "*.app.github.dev",
  ...(codespaceName ? [`${codespaceName}-3000.${codespaceDomain}`] : []),
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins,
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
