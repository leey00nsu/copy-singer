import { AudioLines, Music2, ShieldCheck } from "lucide-react";
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
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(22rem,0.85fr)_minmax(30rem,1.15fr)]">
      <section className="hidden flex-col justify-between border-r bg-muted/35 p-12 lg:flex">
        <ProductBrand />
        <div className="max-w-md">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            One account, one voice
          </p>
          <h1 className="mt-5 text-4xl leading-tight font-semibold tracking-tight">
            분석부터 AI 믹싱까지 이어서 기록하세요.
          </h1>
          <div className="mt-10 divide-y border-y">
            <div className="flex gap-4 py-5">
              <AudioLines aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p className="text-sm leading-6 text-muted-foreground">
                보컬 프로필과 추천 결과를 내 계정에서 다시 확인합니다.
              </p>
            </div>
            <div className="flex gap-4 py-5">
              <Music2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p className="text-sm leading-6 text-muted-foreground">
                진행 중인 믹싱은 페이지를 닫아도 서버에서 계속됩니다.
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Google 계정으로만 로그인할 수 있습니다.</p>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12">
        <div className="lg:hidden">
          <ProductBrand />
        </div>
        <div className="my-auto mx-auto w-full max-w-sm py-16">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Welcome</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">계정으로 시작하세요</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            로그인하면 보컬 프로필, 추천 결과와 AI 믹싱 내역이 계정에 안전하게 연결됩니다.
          </p>

          <div className="mt-8 border-y py-6">
            <GoogleSignIn callbackURL={callbackURL} configured={googleAuthConfigured()} />
          </div>

          <div className="mt-6 flex items-start gap-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-data-accent-foreground" />
            <p>이름, 이메일과 프로필 이미지는 로그인과 사용자 데이터 구분에만 사용합니다.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
