import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UMAK Student Assistant Management System",
  description:
    "The official Student Assistant Management System of Universidad Makati. Apply, manage schedules, track attendance, and more.",
  keywords: [
    "UMAK",
    "Universidad Makati",
    "Student Assistant",
    "SAS",
    "Management System",
  ],
  authors: [{ name: "UMAK SAS Team" }],
  openGraph: {
    title: "UMAK Student Assistant Management System",
    description:
      "The official Student Assistant Management System of Universidad Makati.",
    siteName: "UMAK SAS",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground overflow-x-hidden`}
      >
        <SessionProvider>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </SessionProvider>
      </body>
    </html>
  );
}
