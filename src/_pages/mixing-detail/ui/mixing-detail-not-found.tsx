import { Music2 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

export default function MixingDetailNotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5">
      <div className="max-w-md text-center">
        <Music2 aria-hidden="true" className="mx-auto size-9 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">AI 믹스를 찾을 수 없어요.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">삭제됐거나 본인 소유가 아닌 믹싱 작업입니다.</p>
        <Link className={`${buttonVariants()} mt-6`} href="/library?tab=mixes&page=1">
          Library로 이동
        </Link>
      </div>
    </main>
  );
}
