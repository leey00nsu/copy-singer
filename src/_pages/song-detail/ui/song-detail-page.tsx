import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecommendationError, selectRecommendationItem } from "@/entities/recommendation";
import { requirePageSession } from "@/features/authentication/index.server";
import { getRecommendationRun } from "@/features/create-recommendation/index.server";
import { resourceIdSchema } from "@/shared/api";
import { mixingTicketCost } from "@/shared/config/index.server";
import { SongDetail } from "./song-detail";

export const metadata: Metadata = {
  title: "추천 곡 상세 — Copysinger",
  description: "내 음역과 추천 곡의 저장된 음역, 키 조정 근거와 AI 믹싱 상태를 확인하세요.",
};

export default async function SongDetailPage({ params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const returnTo = `/recommendations/${id}/songs/${itemId}`;
  const session = await requirePageSession(returnTo);
  const parsedRunId = resourceIdSchema.safeParse(id);
  const parsedItemId = resourceIdSchema.safeParse(itemId);
  if (!parsedRunId.success || !parsedItemId.success) notFound();

  let run: Awaited<ReturnType<typeof getRecommendationRun>>;
  try {
    run = await getRecommendationRun(parsedRunId.data, session.user.id);
  } catch (error) {
    if (error instanceof RecommendationError && error.status === 404) notFound();
    throw error;
  }
  if (!selectRecommendationItem(run, parsedItemId.data)) notFound();
  return <SongDetail initialRun={run} itemId={parsedItemId.data} ticketCost={mixingTicketCost()} />;
}
