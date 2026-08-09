import { Music2, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { googleAuthConfigured } from "@/lib/auth/auth";
import { getRequestSession } from "@/lib/auth/session";

function safeCallbackURL(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string | string[] }>;
}) {
  const callbackURL = safeCallbackURL((await searchParams).callbackURL);
  if (await getRequestSession()) redirect(callbackURL);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#f0fdf4,transparent_48%)] px-5 py-14">
      <section className="w-full max-w-md rounded-3xl border bg-background/95 p-8 shadow-xl shadow-emerald-950/5">
        <div className="mb-8 flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
          <Music2 aria-hidden="true" />
        </div>
        <p className="mb-2 text-sm font-semibold text-emerald-700">COPY SINGER</p>
        <h1 className="text-3xl font-bold tracking-tight">내 목소리에 맞는 노래를 찾아보세요</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          보컬 프로필과 믹싱 결과를 안전하게 보관하려면 Google 로그인이 필요합니다.
        </p>
        <div className="my-7 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <p>이름, 이메일, 프로필 이미지만 로그인과 사용자 데이터 구분에 사용합니다.</p>
          </div>
        </div>
        <GoogleSignIn callbackURL={callbackURL} configured={googleAuthConfigured()} />
      </section>
    </main>
  );
}
