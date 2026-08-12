import Link from "next/link";
import { GoogleSignIn } from "@/features/authentication";
import { VoiceOrb } from "@/shared/ui/voice-orb";
import { ProductFooter, ProductHeader } from "@/widgets/product-shell";

type LoginScreenProps = {
  callbackURL: string;
  configured: boolean;
};

function LoginScreen({ callbackURL, configured }: LoginScreenProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ProductHeader showAuthAction={false} />
      <main className="flex min-h-[calc(100svh-4rem)] flex-1 items-center" id="product-content">
        <section className="mx-auto grid w-full max-w-[72rem] gap-10 px-5 py-14 sm:px-7 sm:py-20 lg:grid-cols-[minmax(0,.9fr)_minmax(20rem,.58fr)] lg:items-center lg:px-8">
          <div className="hidden min-h-[28rem] items-center justify-center lg:flex" aria-hidden="true">
            <div className="relative size-[min(34vw,25rem)]">
              <div className="absolute inset-[12%] rounded-full bg-data-accent/8 blur-3xl" />
              <VoiceOrb className="relative size-full" hue={294} hoverIntensity={0} rotateOnHover={false} speed={0.3} />
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-sm flex-col text-center lg:mx-0 lg:text-left">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">
              Continue your voice
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">내 목소리로 계속하기</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              저장한 보컬 프로필과 추천, AI 믹싱 결과를 이어서 확인하세요.
            </p>
            <div className="mt-8 w-full">
              <GoogleSignIn callbackURL={callbackURL} configured={configured} />
            </div>
            <p className="mt-6 text-xs leading-5 text-muted-foreground">
              <span className="block">Google 계정으로 로그인하면</span>
              <span className="block">
                Copy Singer의{" "}
                <Link className="underline underline-offset-2 hover:text-foreground" href="/terms">
                  이용 약관
                </Link>{" "}
                및{" "}
                <Link className="underline underline-offset-2 hover:text-foreground" href="/privacy">
                  개인정보 처리방침
                </Link>
                에 동의하게 됩니다.
              </span>
            </p>
          </div>
        </section>
      </main>
      <ProductFooter />
    </div>
  );
}

export { LoginScreen };
