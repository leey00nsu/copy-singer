import { AudioLines } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";
import { StatePanel } from "@/shared/ui/state-panel";

export default function VocalProfileNotFound() {
  return (
    <main className="flex min-h-[70vh] items-center px-5 py-12 sm:px-8">
      <StatePanel
        action={
          <Link className={buttonVariants()} href="/library?tab=profiles&page=1">
            Library로 이동
          </Link>
        }
        className="mx-auto w-full max-w-3xl"
        description="삭제됐거나 현재 계정에서 볼 수 없는 보컬 프로필이에요."
        headingLevel="h1"
        icon={<AudioLines />}
        title="보컬 프로필을 찾을 수 없어요."
      />
    </main>
  );
}
