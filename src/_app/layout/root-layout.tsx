import type { Metadata } from "next";
import localFont from "next/font/local";
import { buildRootMetadata } from "@/shared/config/index.server";
import { Toaster } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryProvider } from "../providers";
import "../styles/globals.css";

const paperlogy = localFont({
  display: "swap",
  src: "../fonts/Paperlogy-7Bold.ttf",
  variable: "--font-paperlogy",
  weight: "700",
});

export function generateMetadata(): Metadata {
  return buildRootMetadata();
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={paperlogy.variable} lang="ko">
      <body className="antialiased">
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
