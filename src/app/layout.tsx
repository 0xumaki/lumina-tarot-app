import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { ErrorBoundary } from "@/components/lumina/error-boundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumina — Tarot · Manifest · Frequencies",
  description:
    "AI tarot readings, manifestation rituals, and intention-tuned frequency tones. A mystical daily companion for clarity, desire, and resonance.",
  applicationName: "Lumina",
  keywords: [
    "tarot",
    "manifestation",
    "frequencies",
    "888hz",
    "528hz",
    "binaural",
    "spiritual",
    "daily ritual",
    "PWA",
  ],
  authors: [{ name: "Lumina" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lumina",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Lumina — Tarot · Manifest · Frequencies",
    description:
      "AI tarot readings, manifestation rituals, and intention-tuned frequency tones. A mystical daily companion for clarity, desire, and resonance.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1344, height: 768, alt: "Lumina — Tarot · Manifest · Frequencies" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumina — Tarot · Manifest · Frequencies",
    description: "AI tarot readings, manifestation rituals, and intention-tuned frequency tones.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Lumina" />
      </head>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
