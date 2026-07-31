import type { Metadata } from "next";
import { Chakra_Petch, Noto_Sans_Thai } from "next/font/google";

import "./globals.css";

const displayFont = Chakra_Petch({
  subsets: ["latin", "thai"],
  weight: ["500", "600", "700"],
  variable: "--font-xcruizt-display",
});

const bodyFont = Noto_Sans_Thai({
  subsets: ["latin", "thai"],
  variable: "--font-xcruizt-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "XCRUIZT — ReShade Presets for FiveM",
    template: "%s | XCRUIZT",
  },
  description:
    "ReShade presets for FiveM crafted for deliberate color, atmosphere, and clarity.",
  applicationName: "XCRUIZT",
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "XCRUIZT",
    title: "XCRUIZT — ReShade Presets for FiveM",
    description:
      "ปรับแสง สี และบรรยากาศของ FiveM ด้วย ReShade preset จาก XCRUIZT",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
