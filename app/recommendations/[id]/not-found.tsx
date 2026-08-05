import Link from "next/link";
import { Music2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function RecommendationNotFound() {
  return <main className="flex min-h-screen items-center justify-center px-4"><div className="max-w-md text-center"><Music2 className="mx-auto size-9 text-muted-foreground" /><h1 className="mt-4 text-2xl font-semibold">추천 결과를 찾을 수 없어요.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">삭제됐거나 올바르지 않은 주소입니다. 보컬 프로필에서 추천을 다시 만들어주세요.</p><Link className={`${buttonVariants()} mt-6`} href="/profile">보컬 프로필로 이동</Link></div></main>;
}
