import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Camelot — Dining & Live Performance in Downtown Riverside",
  description:
    "Discover Camelot, a planned immersive dining and live-performance destination in Downtown Riverside combining Modern American cuisine, Asian influence, signature cocktails and multimedia storytelling.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
