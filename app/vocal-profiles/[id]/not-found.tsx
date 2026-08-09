import { AudioLines } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function VocalProfileNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="max-w-md text-center">
        <AudioLines className="mx-auto size-9 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">보컬 프로필을 찾을 수 없어요.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">삭제됐거나 본인 소유가 아닌 프로필입니다.</p>
        <Link className={`${buttonVariants()} mt-6`} href="/vocal-profiles">
          내 프로필로 이동
        </Link>
      </div>
    </main>
  );
}
