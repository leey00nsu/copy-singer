import { Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/shared/ui/button";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";
import { LibraryTabs } from "@/widgets/library";

export function LibraryPageContent({ children, tab }: { children: ReactNode; tab: "profiles" | "mixes" }) {
  return (
    <div className="mx-auto w-full max-w-[72rem] px-5 py-12 sm:px-7 lg:px-8 lg:py-14">
      <ProductPageIntro
        aside={
          <Link className={buttonVariants({ size: "sm" })} href="/profile">
            <Plus aria-hidden="true" className="size-4" /> 새 목소리 분석
          </Link>
        }
        description="저장된 보컬 프로필과 AI 믹싱 결과를 한곳에서 확인할 수 있어요."
        eyebrow="Library"
        title="내 라이브러리"
      />
      <div className="mt-7">
        <LibraryTabs tab={tab} />
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
