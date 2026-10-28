import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CBT Sekolah — Platform Ujian Online Indonesia",
  description:
    "Platform Computer Based Test online untuk SD/MI, SMP/MTs, SMA/MA, SMK, dan pesantren. Aman, multi-sekolah, dan responsif.",
  keywords: ["CBT", "ujian online", "sekolah", "indonesia", "computer based test"],
  authors: [{ name: "CBT Sekolah" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CBT Sekolah",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f2540",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // cegah zoom saat ujian
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <Sonner position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
