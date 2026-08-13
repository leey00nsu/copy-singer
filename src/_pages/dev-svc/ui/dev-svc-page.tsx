import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { devSvcEnabled } from "@/features/development-conversion/index.server";
import { PRIVATE_ROBOTS } from "@/shared/config/index.server";
import { SingerWorkbench } from "./singer-workbench";

export const metadata: Metadata = {
  title: "SVC 개발 Workbench — Copy Singer",
  description: "SoulX-Singer API의 reference, target과 advanced settings를 직접 검증하는 개발 화면입니다.",
  robots: PRIVATE_ROBOTS,
};

type DevSvcSearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SvcDevelopmentPage({ searchParams }: { searchParams: DevSvcSearchParams }) {
  if (!devSvcEnabled()) notFound();
  const query = await searchParams;
  const runId = firstSearchParam(query.runId);
  const itemId = firstSearchParam(query.itemId);
  const hasHandoffParams = runId !== undefined || itemId !== undefined;
  const handoff = runId && itemId ? { runId, itemId } : null;
  return (
    <div>
      <div className="border-b border-amber-500/25 bg-amber-500/8 px-4 py-2 text-center text-xs text-amber-800">
        개발용 SVC Workbench · 일반 추천 흐름에서는 설정이 자동 적용됩니다.
      </div>
      <SingerWorkbench handoff={handoff} handoffInvalid={hasHandoffParams && handoff === null} />
    </div>
  );
}
