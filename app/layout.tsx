import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Ambagan!",
  description:
    "A community savings and lending platform built on Stellar. Pool contributions, vote on loans, and keep every transaction verifiable on-chain.",
};

const nunito = Nunito({
  variable: "--font-nunito",
  weight: ["400", "500", "700", "800"],
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunito.variable} antialiased`}>{children}</body>
    </html>
  );
}
