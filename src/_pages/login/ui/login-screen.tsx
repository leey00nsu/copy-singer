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
          <div className="mt-10 w-full">
            <GoogleSignIn callbackURL={callbackURL} configured={configured} />
          </div>
        </div>
      </section>
    </main>
  );
}

export { LoginScreen };
