import { Music2 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";
import { StatePanel } from "@/shared/ui/state-panel";

export default function MixingDetailNotFound() {
  return (
    <main className="flex min-h-[70vh] items-center px-5 py-12 sm:px-8">
      <StatePanel
        action={
          <Link className={buttonVariants()} href="/library?tab=mixes&page=1">
            Library로 이동
          </Link>
        }
        className="mx-auto w-full max-w-3xl"
        description="삭제됐거나 본인 소유가 아닌 믹싱 작업입니다."
        headingLevel="h1"
        icon={<Music2 />}
        title="AI 믹스를 찾을 수 없어요."
      />
    </main>
  );
}
