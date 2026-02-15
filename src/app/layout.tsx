import type { Metadata } from "next";
import { Geist, Instrument_Serif, DM_Sans } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-heading",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kenso AI — AI-powered customer support for Shopify",
  description:
    "Kenso AI automatically replies to customer support emails for Shopify merchants using AI. Handle order status, returns, and product questions instantly.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://senro.co"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${instrumentSerif.variable} ${dmSans.variable} font-body antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
