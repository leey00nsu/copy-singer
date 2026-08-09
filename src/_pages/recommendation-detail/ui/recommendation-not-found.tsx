import { Music2 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";
import { StatePanel } from "@/shared/ui/state-panel";

export default function RecommendationNotFound() {
  return (
    <main className="flex min-h-[70vh] items-center px-5 py-12 sm:px-8">
      <StatePanel
        action={
          <Link className={buttonVariants()} href="/profile">
            새 목소리 분석
          </Link>
        }
        className="mx-auto w-full max-w-3xl"
        description="삭제됐거나 올바르지 않은 주소입니다. Library에서 저장된 결과를 다시 확인해주세요."
        headingLevel="h1"
        icon={<Music2 />}
        title="추천 결과를 찾을 수 없어요."
      />
    </main>
  );
}
