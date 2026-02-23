import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JanuaClientProvider } from "../components/JanuaClientProvider";
import { KeySyncManager } from "../components/KeySyncManager";
import { ToastProvider } from "../components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kinship — Secure Community Scheduling & Resource Pooling",
  description: "Tiered trust architecture for coordinating schedules, assets, and community resources securely.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <JanuaClientProvider>
          <ToastProvider>
            <KeySyncManager />
            {children}
          </ToastProvider>
        </JanuaClientProvider>
      </body>
    </html>
  );
}
