import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Libre_Caslon_Text } from "next/font/google";
import "./globals.css";
import IOSInstallBanner from "@/components/pwa/IOSInstallBanner";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import SplashScreen from "@/components/pwa/SplashScreen";
import AppleSplashLinks from "@/components/pwa/AppleSplashLinks";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const caslon = Libre_Caslon_Text({
  variable: "--font-caslon",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://strandia.fashion"),
  title: "StrandIA — Tu armario digital con IA",
  description:
    "Genera outfits con la ropa que ya tienes. StrandIA combina inteligencia artificial con tu armario para ayudarte a vestir mejor y comprar de forma más inteligente.",
  keywords: ["armario digital", "outfits IA", "moda inteligente", "StrandIA"],
  manifest: "/manifest.json",
  openGraph: {
    title: "StrandIA — Tu armario digital con IA",
    description:
      "Genera outfits con la ropa que ya tienes. StrandIA combina inteligencia artificial con tu armario para ayudarte a vestir mejor y comprar de forma más inteligente.",
    url: "https://strandia.fashion",
    siteName: "StrandIA",
    locale: "es",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "StrandIA — Tu armario digital con IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StrandIA — Tu armario digital con IA",
    description:
      "Genera outfits con la ropa que ya tienes. StrandIA combina inteligencia artificial con tu armario para ayudarte a vestir mejor.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StrandIA",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A1A1A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${hanken.variable} ${caslon.variable} h-full`}
      // Crema base pintada antes de que cargue el CSS: mata el negro por
      // defecto del arranque/hydrate. Es el mismo valor que el token --color-bg
      // (#fcf9f6) que aplica el `bg-bg` del <body>, así no hay salto de tono.
      style={{ backgroundColor: "#fcf9f6" }}
    >
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <AppleSplashLinks />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        {children}
        <SplashScreen />
        <IOSInstallBanner />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
