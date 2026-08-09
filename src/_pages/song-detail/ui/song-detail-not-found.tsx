import { Music2 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

export default function SongDetailNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="max-w-md text-center">
        <Music2 className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold">추천 곡을 찾을 수 없어요.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          삭제됐거나 본인 소유가 아닌 추천 결과, 또는 이 추천에 포함되지 않은 곡입니다.
        </p>
        <Link className={`${buttonVariants()} mt-6`} href="/vocal-profiles">
          보컬 프로필로 이동
        </Link>
      </div>
    </div>
  );
}
