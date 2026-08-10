import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignIn, safeCallbackURL } from "@/features/authentication";
import { getRequestSession, googleAuthConfigured } from "@/features/authentication/index.server";
import { ProductBrand } from "@/widgets/product-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string | string[] }>;
}) {
  const callbackURL = safeCallbackURL((await searchParams).callbackURL);
  if (await getRequestSession()) redirect(callbackURL);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-[72rem] items-center justify-between px-5 sm:px-7 lg:px-8">
          <ProductBrand />
          <Link className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" href="/">
            <ArrowLeft aria-hidden="true" className="size-3.5" /> 홈으로
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-[72rem] place-items-center px-5 py-16 sm:px-7 sm:py-20 lg:px-8">
        <div className="w-full max-w-[28rem]">
          <div className="text-center">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">Account</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">계정으로 시작하세요</h1>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
              보컬 프로필, 추천 결과와 AI 믹싱 기록을 한 계정에서 이어서 확인합니다.
            </p>
          </div>

          <div className="mt-10 border-y py-7">
            <GoogleSignIn callbackURL={callbackURL} configured={googleAuthConfigured()} />
          </div>

          <div className="mt-6 flex items-start justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <p>현재는 Google 계정으로만 로그인할 수 있습니다.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
