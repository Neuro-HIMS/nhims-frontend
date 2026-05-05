import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/layouts/providers";

// ── Font definitions
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-dm-serif",
  weight: "400",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  display: "swap",
});

// ── App metadata
export const metadata: Metadata = {
  title: {
    default: "HMIS — Hospital Management Information System",
    template: "%s | HMIS",
  },
  description:
    "Hospital Management Information System for Ghana Health Service facilities.",
  robots: {
    index: false,   // Never indexed — internal clinical system
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${dmSerifDisplay.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
