import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecommendationError } from "@/entities/recommendation";
import {
  getAnalysisResourceActor,
  getRequestSession,
  requirePageSession,
} from "@/features/authentication/index.server";
import { getRecommendationResult } from "@/features/create-recommendation/index.server";
import { resourceIdSchema } from "@/shared/api";
import { mixingTicketCost } from "@/shared/config/index.server";
import { RecommendationResults } from "./recommendation-results";

export const metadata: Metadata = {
  title: "내 노래 추천 순위 — Copysinger",
  description: "내 보컬 프로필과 잘 맞는 노래 순위와 추천 노래방 키를 확인하세요.",
};

export default async function RecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getAnalysisResourceActor(undefined, { profileId: id });
  if (!actor) {
    await requirePageSession(`/recommendations/${id}`);
    notFound();
  }
  const parsedProfileId = resourceIdSchema.safeParse(id);
  if (!parsedProfileId.success) notFound();
  let result: Awaited<ReturnType<typeof getRecommendationResult>>;
  try {
    result = await getRecommendationResult(parsedProfileId.data, actor.userId);
  } catch (error) {
    if (error instanceof RecommendationError && error.status === 404) notFound();
    throw error;
  }
  return (
    <RecommendationResults
      initialRun={result}
      ticketCost={mixingTicketCost()}
      guest={actor.guest}
      signedIn={Boolean(await getRequestSession())}
    />
  );
}
