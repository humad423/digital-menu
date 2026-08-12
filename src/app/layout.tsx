import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import PhoneAuthModal from "@/components/PhoneAuthModal";
import TopProgressBar from "@/components/TopProgressBar";
import InstallPwaPrompt from "@/components/InstallPwaPrompt";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ألف سوق | Alfsouq - المنصة التجارية الشاملة للمتاجر والعروض",
  description: "ألف سوق (alfsouq.com) - المنصة التجارية الشاملة لتصفح أحدث المتاجر والمطاعم والمنتجات والعروض التنافسية وتسهيل الطلب المباشر.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ألف سوق",
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
};

import GoogleAnalytics from "@/components/GoogleAnalytics";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <GoogleAnalytics />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.deferredPwaPrompt = e;
              });
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(){});
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full w-full bg-slate-950 text-slate-900 antialiased overflow-x-hidden">
        <AuthProvider>
          <Suspense fallback={null}>
            <TopProgressBar />
          </Suspense>
          {children}
          <PhoneAuthModal />
          <InstallPwaPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
