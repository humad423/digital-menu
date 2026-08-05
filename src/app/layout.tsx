import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import PhoneAuthModal from "@/components/PhoneAuthModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ألف سوق | Alfsouq - منصة المطاعم والعروض الأولى",
  description: "ألف سوق (alfsouq.com) - المنصة التجارية الشاملة لتصفح أحدث المطاعم والوجبات والعروض التنافسية وتسهيل الطلب المباشر.",
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
          {children}
          <PhoneAuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
