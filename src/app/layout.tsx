import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import TopProgressBar from "@/components/TopProgressBar";
import PwaManager from "@/components/pwa/PwaManager";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import Toaster from "@/components/Toaster";
import LatinDigits from "@/components/LatinDigits";
import { Suspense } from "react";
import { SITE_URL } from "@/config/site";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["500", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ألف سوق: كل السوق في جوالك",
  description: "ألف سوق: كل السوق في جوالك. شوف المتاجر القريبة منك ومنتجاتها وأسعارها، واطلب منها مباشرة على واتساب.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ألف سوق",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${tajawal.variable} h-full antialiased`}
    >
      <body className="min-h-full w-full overflow-x-hidden">
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        {children}
        <PwaManager />
        <Toaster />
        <LatinDigits />
      </body>
    </html>
  );
}
