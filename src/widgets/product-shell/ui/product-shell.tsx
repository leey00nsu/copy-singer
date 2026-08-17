"use client";

import { Library, Menu, Mic2, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { UserMenu } from "@/features/authentication";
import { NotificationBell } from "@/features/manage-notifications";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import type { OnboardingSnapshot } from "../model/onboarding-contract";
import { isProductPathActive, productNavigation } from "../model/product-navigation";
import { NewUserOnboardingDialog } from "./new-user-onboarding-dialog";
import { ProductBrand } from "./product-brand";

const productNavigationIcons = {
  microphone: Mic2,
  library: Library,
  account: UserRound,
  admin: ShieldCheck,
} as const;

type ProductUser = {
  developmentBypass?: boolean;
  email: string;
  image?: string | null;
  name: string;
};

type ProductNavigationProps = {
  admin?: boolean;
  authenticated?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
};

function navigationHref(href: string, authenticated: boolean) {
  if (authenticated) return href;
  return `/login?callbackURL=${encodeURIComponent(href)}`;
}

function ProductNavigation({
  admin = false,
  authenticated = true,
  mobile = false,
  onNavigate,
}: ProductNavigationProps) {
  const pathname = usePathname();
  const items = admin
    ? [...productNavigation, { href: "/admin", label: "Admin", icon: "admin" as const }]
    : productNavigation;

  return (
    <nav aria-label="제품 메뉴" className={cn(mobile ? "grid gap-1" : "flex h-16 items-stretch gap-9")}>
      {items.map(({ href, icon, label }) => {
        const Icon = productNavigationIcons[icon];
        const active = authenticated && isProductPathActive(pathname, href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
              mobile && "gap-3 rounded-md px-3 hover:bg-muted",
              !mobile && "h-16 border-b border-transparent px-0.5",
              active && (mobile ? "bg-muted text-foreground" : "border-foreground text-foreground"),
            )}
            href={navigationHref(href, authenticated)}
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

type ProductHeaderProps = {
  admin?: boolean;
  showAuthAction?: boolean;
  user?: ProductUser | null;
};

function ProductHeader({ admin = false, showAuthAction = true, user = null }: ProductHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const authenticated = Boolean(user);

  useEffect(() => {
    const updateScrolled = () => {
      const next = window.scrollY > 8;
      setScrolled((current) => (current === next ? current : next));
    };

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 bg-background/72 backdrop-blur-xl backdrop-saturate-150 transition-colors duration-300 supports-[backdrop-filter]:bg-background/64"
      data-scrolled={scrolled ? "true" : "false"}
      data-testid="product-header"
    >
      <div className="relative mx-auto flex h-16 w-full max-w-[72rem] items-center justify-between gap-6 px-5 sm:px-7 md:grid md:grid-cols-[1fr_auto_1fr] lg:px-8">
        <ProductBrand href="/" />
        <div className="hidden md:block">
          <ProductNavigation admin={admin} authenticated={authenticated} />
        </div>
        <div className="flex items-center justify-self-end gap-2">
          {user ? <NotificationBell /> : null}
          {user ? (
            <div className="hidden md:block">
              <UserMenu
                admin={admin}
                compact
                developmentBypass={user.developmentBypass}
                email={user.email}
                image={user.image}
                name={user.name}
                side="bottom"
              />
            </div>
          ) : showAuthAction ? (
            <div className="hidden sm:block">
              <Button nativeButton={false} render={<Link href="/login?callbackURL=%2Fprofile" />} size="sm">
                로그인
              </Button>
            </div>
          ) : null}
          <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
            <SheetTrigger
              className="md:hidden"
              render={<Button aria-label="제품 메뉴 열기" size="icon" variant="outline" />}
            >
              <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent className="w-[min(22rem,calc(100%-2rem))]" side="right">
              <SheetHeader>
                <SheetTitle>Copysinger</SheetTitle>
                <SheetDescription>이동할 메뉴를 선택해 주세요.</SheetDescription>
              </SheetHeader>
              <div className="rounded-xl bg-muted/30 px-3 py-4" data-mobile-navigation-surface="quiet">
                <ProductNavigation
                  admin={admin}
                  authenticated={authenticated}
                  mobile
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
              <div className="mt-auto p-3">
                {user ? (
                  <UserMenu
                    admin={admin}
                    developmentBypass={user.developmentBypass}
                    email={user.email}
                    image={user.image}
                    name={user.name}
                    side="top"
                  />
                ) : showAuthAction ? (
                  <Button nativeButton={false} render={<Link href="/login?callbackURL=%2Fprofile" />}>
                    로그인
                  </Button>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-px transition-colors duration-300",
            scrolled ? "bg-border/80" : "bg-transparent",
          )}
          data-testid="product-header-separator"
        />
      </div>
    </header>
  );
}

function ProductFooter() {
  return (
    <footer className="bg-background/72 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/64">
      <div
        className="mx-auto flex w-full max-w-[72rem] flex-col gap-5 border-t border-border/80 px-5 py-7 text-xs text-muted-foreground sm:px-7 md:flex-row md:items-end md:justify-between lg:px-8"
        data-testid="product-footer-rail"
      >
        <div>
          <ProductBrand href="/" />
          <p className="mt-3 text-[11px]">© 2026 Copysinger.</p>
        </div>
        <nav aria-label="제품 푸터 메뉴" className="flex flex-wrap gap-x-7 gap-y-2 text-[11px]">
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/terms">
            이용 약관
          </Link>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/privacy">
            개인정보 처리방침
          </Link>
          <span>문의하기</span>
        </nav>
      </div>
    </footer>
  );
}

type ProductShellProps = {
  admin?: boolean;
  children: ReactNode;
  onboarding?: OnboardingSnapshot;
  user: ProductUser;
};

function ProductShell({ admin = false, children, onboarding, user }: ProductShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        className="fixed top-3 left-3 z-[70] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0"
        href="#product-content"
      >
        본문 바로가기
      </a>
      <ProductHeader admin={admin} user={user} />
      <main className="min-h-[calc(100svh-4rem)] min-w-0 flex-1" id="product-content" tabIndex={-1}>
        {children}
      </main>
      <ProductFooter />
      {onboarding?.required ? <NewUserOnboardingDialog wallets={onboarding.wallets} /> : null}
    </div>
  );
}

export type { ProductHeaderProps, ProductShellProps, ProductUser };
export { ProductFooter, ProductHeader, ProductNavigation, ProductShell };
