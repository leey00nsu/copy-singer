import { GoogleSignIn } from "@/features/authentication";
import { ProductBrand, ProductMark } from "@/widgets/product-shell";

type LoginScreenProps = {
  callbackURL: string;
  configured: boolean;
};

function LoginScreen({ callbackURL, configured }: LoginScreenProps) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-[72rem] items-center px-5 sm:px-7 lg:px-8">
          <ProductBrand />
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100svh-4rem)] w-full place-items-center px-5 py-16 sm:px-7 sm:py-20">
        <div className="flex w-full max-w-sm flex-col items-center text-center">
          <ProductMark className="size-24 sm:size-28" preload />
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Copy Singer</h1>
          <p className="mt-3 text-sm text-muted-foreground">계속하려면 로그인하세요.</p>
          <div className="mt-8 w-full">
            <GoogleSignIn callbackURL={callbackURL} configured={configured} />
          </div>
          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            <span className="block">Google 계정으로 로그인하면</span>
            <span className="block">
              Copy Singer의 <span className="underline underline-offset-2">이용 약관</span> 및{" "}
              <span className="underline underline-offset-2">개인정보 처리방침</span>에 동의하게 됩니다.
            </span>
          </p>
        </div>
      </section>
    </main>
  );
}

export { LoginScreen };
