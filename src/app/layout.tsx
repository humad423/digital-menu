import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import TopProgressBar from "@/components/TopProgressBar";
import PwaManager from "@/components/pwa/PwaManager";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import Toaster from "@/components/Toaster";
import { Suspense } from "react";
import { SITE_URL } from "@/config/site";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ألف سوق | Alfsouq - المنصة التجارية الشاملة للمتاجر والعروض",
  description: "ألف سوق (alfsouq.com) - المنصة التجارية الشاملة لتصفح أحدث المتاجر والمطاعم والمنتجات والعروض التنافسية وتسهيل الطلب المباشر.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "ألف سوق",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
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
      <body className="min-h-full w-full bg-slate-950 text-slate-900 antialiased overflow-x-hidden">
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        {children}
        <PwaManager />
        <Toaster />
      </body>
    </html>
  );
}
