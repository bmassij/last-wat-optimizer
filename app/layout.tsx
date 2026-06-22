import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Barlow, Black_Ops_One } from "next/font/google";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const blackops = Black_Ops_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-blackops",
  display: "swap",
});

const barlow = Barlow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ORC — Optimization Resource Commander",
  description: "Last War: Survival — maximaliseer beloningen via VS + Arms Race overlap optimalisatie",
  keywords: ["Last War", "Victory Showdown", "Arms Race", "optimization", "ORC"],
  icons: {
    icon: "/icons/favicon.png",
    apple: "/icons/favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a1050",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${bebas.variable} ${blackops.variable} ${barlow.variable}`}>
      <body>{children}</body>
    </html>
  );
}
