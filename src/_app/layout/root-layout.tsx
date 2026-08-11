import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { Toaster } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryProvider } from "../providers";
import "../styles/globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "Copy Singer — 내 목소리에 맞는 노래",
    description: "목소리를 분석해 어울리는 노래와 키를 찾고 AI 믹싱 결과를 만들어보세요.",
    icons: {
      icon: [{ url: "/favicon.png", sizes: "64x64", type: "image/png" }],
      shortcut: "/favicon.png",
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      title: "Copy Singer",
      description: "내 음역을 측정하고 어울리는 노래와 키를 찾아보세요.",
      images: [
        { url: `${origin}/og.png`, width: 1200, height: 630, alt: "Copy Singer singing voice conversion waveform" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Copy Singer",
      description: "내 음역을 측정하고 어울리는 노래와 키를 찾아보세요.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistMono.variable} antialiased`}>
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
