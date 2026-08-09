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

function ProductNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="제품 메뉴" className="grid gap-1">
      {productNavigation.map(({ href, icon, label }) => {
        const Icon = productNavigationIcons[icon];
        const active = isProductPathActive(pathname, href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/40",
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
            href={href}
            key={href}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" className="size-4" />
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
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        className="fixed top-3 left-3 z-[70] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0"
        href="#product-content"
      >
        본문 바로가기
      </a>

      <aside className="sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <ProductBrand className="px-2 py-1" href="/profile" />
        <div className="mt-9">
          <ProductNavigation />
        </div>
        <div className="mt-auto border-t border-sidebar-border pt-3">
          <UserMenu admin={admin} email={user.email} image={user.image} name={user.name} side="top" />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-5 backdrop-blur lg:hidden">
          <ProductBrand href="/profile" />
          <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
            <SheetTrigger render={<Button aria-label="제품 메뉴 열기" size="icon" variant="outline" />}>
              <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent className="w-[min(22rem,calc(100%-2rem))]" side="left">
              <SheetHeader>
                <SheetTitle>Copy Singer</SheetTitle>
                <SheetDescription>목소리 분석, 라이브러리와 내 계정으로 이동합니다.</SheetDescription>
              </SheetHeader>
              <div className="border-y px-3 py-4">
                <ProductNavigation onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="mt-auto p-3">
                <UserMenu admin={admin} email={user.email} image={user.image} name={user.name} side="top" />
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <main className="min-h-screen" id="product-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

export type { ProductShellProps };
export { ProductShell };
