import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getAppUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "SEG VISIOM",
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "SEG VISIOM",
    template: "%s | SEG VISIOM",
  },
  description:
    "Gestão de campo para segurança, energia e conectividade.",
  icons: {
    icon: [
      {
        url: "/segvisiom/logo-simbolo-transparente.png",
        type: "image/png",
      },
    ],
    apple: "/segvisiom/logo-simbolo-transparente.png",
  },
  openGraph: {
    title: "SEG VISIOM",
    description: "Segurança, energia e conectividade em uma operação integrada.",
    siteName: "SEG VISIOM",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/segvisiom/logo-horizontal-transparente.png",
        width: 1774,
        height: 887,
        alt: "SEG VISIOM - Segurança, Energia e Conectividade",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#071a33",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
