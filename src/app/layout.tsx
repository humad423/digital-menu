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
      <body className="min-h-full flex flex-col">
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
