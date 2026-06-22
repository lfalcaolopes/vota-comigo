import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppFooter, AppHeader } from "@/shared/navigation";

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
  title: "Quem Vota Comigo",
  description:
    "Transparência política baseada em votos reais da Câmara dos Deputados.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppHeader />
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
