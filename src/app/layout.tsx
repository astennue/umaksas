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
  title: "UMak Student Assistantship Society",
  description:
    "The official Student Assistantship Society of Universidad Makati. Apply, manage schedules, track attendance, and more.",
  keywords: [
    "UMAK",
    "UMAK SAS",
    "UMak SAS",
    "UMak Student Assistantship Society",
    "Universidad Makati",
    "Student Assistant",
    "SAS",
    "Management System",
  ],
  authors: [{ name: "UMAK SAS Team" }],
  icons: {
    icon: "/logo/umak-sas-logo.png",
    shortcut: "/logo/umak-sas-logo.png",
    apple: "/logo/umak-sas-logo.png",
  },
  openGraph: {
    title: "UMak Student Assistantship Society",
    description:
      "The official Student Assistantship Society of Universidad Makati.",
    siteName: "UMak Student Assistantship Society",
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
      <head>
        <link rel="icon" type="image/png" href="/logo/umak-sas-logo.png" />
      </head>
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
