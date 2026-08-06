import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/auth/user-menu";
import { getRequestSession } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/admin-policy";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
    title: "Copy Singer — 보컬 프로필과 음성 합성",
    description: "내 음역을 측정하고 SoulX-Singer로 보컬 합성을 테스트하세요.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Copy Singer",
      description: "내 음역을 측정하고 어울리는 노래와 키를 찾아보세요.",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "Copy Singer singing voice conversion waveform" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Copy Singer",
      description: "내 음역을 측정하고 어울리는 노래와 키를 찾아보세요.",
      images: [`${origin}/og.png`],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getRequestSession();
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TooltipProvider>
          {session ? (
            <div className="fixed right-4 top-4 z-50">
              <UserMenu name={session.user.name} image={session.user.image} admin={isAdminEmail(session.user.email)} />
            </div>
          ) : null}
          {children}
        </TooltipProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
