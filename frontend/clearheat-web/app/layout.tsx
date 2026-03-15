import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import CookieBanner from "@/components/clearheat/CookieBanner";
import SiteFooter from "@/components/clearheat/SiteFooter";
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
  title: "ClearHeat – Heat Pump Payback Calculator",
  description:
    "Check if a heat pump will pay back for your home using Irish weather data.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <html lang="en">
    <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      {children}
      <SiteFooter />
      <CookieBanner />
      <Analytics />
    </body>
  </html>
);
}