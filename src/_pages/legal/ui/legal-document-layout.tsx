import Link from "next/link";
import type { ReactNode } from "react";

import { ProductBrand } from "@/widgets/product-shell";

type LegalDocumentLayoutProps = {
  children: ReactNode;
  description: string;
  effectiveDate: string;
  title: string;
};

function LegalDocumentLayout({ children, description, effectiveDate, title }: LegalDocumentLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        className="fixed top-3 left-3 z-50 -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0"
        href="#legal-content"
      >
        본문 바로가기
      </a>
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-[72rem] items-center px-5 sm:px-7 lg:px-8">
          <ProductBrand />
        </div>
      </header>

      <main className="flex-1" id="legal-content" tabIndex={-1}>
        <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-7 sm:py-16 lg:px-8 lg:py-20">
          <header className="border-b border-border/80 pb-9">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">Legal</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
            <dl className="mt-6 text-xs">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">시행일</dt>
                <dd className="font-medium">{effectiveDate}</dd>
              </div>
            </dl>
          </header>

          <div className="mt-12 space-y-12">{children}</div>
        </article>
      </main>

      <footer className="border-t border-border/80">
        <nav
          aria-label="법률 문서"
          className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-6 gap-y-2 px-5 py-7 text-xs text-muted-foreground sm:px-7 lg:px-8"
        >
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/terms">
            이용 약관
          </Link>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/privacy">
            개인정보 처리방침
          </Link>
        </nav>
      </footer>
    </div>
  );
}

function LegalSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="scroll-mt-24">
      <h2 className="text-lg font-semibold tracking-[-0.025em]">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}

function LegalDataList({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-border/70 border-y border-border/70">{children}</dl>;
}

function LegalDataItem({ children, term }: { children: ReactNode; term: string }) {
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[9rem_1fr] sm:gap-5">
      <dt className="font-semibold text-foreground">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export { LegalDataItem, LegalDataList, LegalDocumentLayout, LegalList, LegalSection };
