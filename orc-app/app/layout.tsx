import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORC — Optimization Resource Commander",
  description: "Last War: Survival — maximaliseer beloningen via VS + Arms Race overlap optimalisatie",
  keywords: ["Last War", "Victory Showdown", "Arms Race", "optimization", "ORC"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#080b0f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
