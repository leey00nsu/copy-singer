import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SingerWorkbench } from "@/components/singer-workbench";
import { devSvcEnabled } from "@/features/development-conversion/index.server";

export const metadata: Metadata = {
  title: "SVC 개발 Workbench — Copy Singer",
  description: "SoulX-Singer API의 reference, target과 advanced settings를 직접 검증하는 개발 화면입니다.",
};

export default function SvcDevelopmentPage() {
  if (!devSvcEnabled()) notFound();
  return (
    <div>
      <div className="border-b border-amber-500/25 bg-amber-500/8 px-4 py-2 text-center text-xs text-amber-800">
        개발용 SVC Workbench · 일반 추천 흐름에서는 설정이 자동 적용됩니다.
      </div>
      <SingerWorkbench />
    </div>
  );
}
