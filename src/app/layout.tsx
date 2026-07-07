import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import IOSInstallBanner from "@/components/pwa/IOSInstallBanner";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
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
  themeColor: "#8B9E8A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${playfair.variable} h-full`}
    >
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        {children}
        <IOSInstallBanner />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
