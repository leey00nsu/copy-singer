import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecommendationError } from "@/entities/recommendation";
import { requirePageSession } from "@/features/authentication/index.server";
import { getRecommendationResult } from "@/features/create-recommendation/index.server";
import { resourceIdSchema } from "@/shared/api";
import { mixingTicketCost } from "@/shared/config/index.server";
import { RecommendationResults } from "./recommendation-results";

export const metadata: Metadata = {
  title: "내 노래 추천 순위 — Copysinger",
  description: "내 보컬 프로필과 잘 맞는 100곡 전체 순위와 추천 노래방 키를 확인하세요.",
};

export default async function RecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePageSession(`/recommendations/${id}`);
  const parsedProfileId = resourceIdSchema.safeParse(id);
  if (!parsedProfileId.success) notFound();
  let result: Awaited<ReturnType<typeof getRecommendationResult>>;
  try {
    result = await getRecommendationResult(parsedProfileId.data, session.user.id);
  } catch (error) {
    if (error instanceof RecommendationError && error.status === 404) notFound();
    throw error;
  }
  return <RecommendationResults initialRun={result} ticketCost={mixingTicketCost()} />;
}
