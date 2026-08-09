import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";
import { StatePanel } from "@/shared/ui/state-panel";

export function ProductRouteNotFound() {
  return (
    <main className="flex min-h-[70vh] items-center px-5 py-12 sm:px-8">
      <StatePanel
        action={
          <Link className={buttonVariants()} href="/library">
            Library로 이동
          </Link>
        }
        className="mx-auto w-full max-w-3xl"
        description="주소가 바뀌었거나 본인 계정에서 확인할 수 없는 항목입니다."
        headingLevel="h1"
        icon={<FileQuestion />}
        title="페이지를 찾을 수 없어요."
      />
    </main>
  );
}
