"use client";

import { Library, Menu, Mic2, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { UserMenu } from "@/features/authentication";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { isProductPathActive, productNavigation } from "../model/product-navigation";
import { ProductBrand } from "./product-brand";

const productNavigationIcons = {
  microphone: Mic2,
  library: Library,
  account: UserRound,
} as const;

function ProductNavigation({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="제품 메뉴" className={cn(mobile ? "grid gap-1" : "flex items-center gap-1")}>
      {productNavigation.map(({ href, icon, label }) => {
        const Icon = productNavigationIcons[icon];
        const active = isProductPathActive(pathname, href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
              mobile && "gap-3",
              active && "bg-muted text-foreground",
            )}
            href={href}
            key={href}
            onClick={onNavigate}
          >
            {mobile ? <Icon aria-hidden="true" className="size-4" /> : null}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

type ProductShellProps = {
  admin?: boolean;
  children: ReactNode;
  user: {
    email: string;
    image?: string | null;
    name: string;
  };
};

function ProductShell({ admin = false, children, user }: ProductShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        className="fixed top-3 left-3 z-[70] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0"
        href="#product-content"
      >
        본문 바로가기
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[88rem] items-center justify-between gap-6 px-5 md:grid md:grid-cols-[1fr_auto_1fr] md:px-8 lg:px-12">
          <ProductBrand href="/profile" />
          <div className="hidden md:block">
            <ProductNavigation />
          </div>
          <div className="hidden justify-self-end md:block">
            <UserMenu admin={admin} compact email={user.email} image={user.image} name={user.name} side="bottom" />
          </div>
          <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
            <SheetTrigger
              className="md:hidden"
              render={<Button aria-label="제품 메뉴 열기" size="icon" variant="outline" />}
            >
              <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent className="w-[min(22rem,calc(100%-2rem))]" side="right">
              <SheetHeader>
                <SheetTitle>Copy Singer</SheetTitle>
                <SheetDescription>목소리 분석, 라이브러리와 내 계정으로 이동합니다.</SheetDescription>
              </SheetHeader>
              <div className="border-y px-3 py-4">
                <ProductNavigation mobile onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="mt-auto p-3">
                <UserMenu admin={admin} email={user.email} image={user.image} name={user.name} side="top" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="min-h-[calc(100svh-4rem)] min-w-0 flex-1" id="product-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

export type { ProductShellProps };
export { ProductShell };
