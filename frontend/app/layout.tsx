import type { Metadata } from "next";
import { AppProviders } from "@/components/AppProviders";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Balkans Relocation App | Explore. Analyze. Decide. Thrive.",
  description:
    "Compare Balkans cities, analyze finances, and find affordable living — all in your browser. Built for nomads and expats.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${ibmPlexMono.variable}`}>
      <body className="app-theme">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
