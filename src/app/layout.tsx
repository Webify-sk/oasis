import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
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
  title: "Oasis Lounge",
  description: "Váš priestor pre zdravie a relax.",
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <GlobalLoader />
        {children}
      </body>
    </html>
  );
}
