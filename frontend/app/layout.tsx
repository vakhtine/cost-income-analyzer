import type { Metadata } from "next";
import { AppBrandBackground } from "@/components/AppBrandBackground";
import { AppProviders } from "@/components/AppProviders";
import { Caveat, DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-script",
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
    <html lang="en" className={`${dmSans.variable} ${caveat.variable}`}>
      <body className="app-theme">
        <AppBrandBackground />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
