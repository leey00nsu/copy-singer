import type { Metadata } from "next";
import { requirePageSession } from "@/features/authentication/index.server";
import { mixingTicketCost } from "@/shared/config/index.server";
import { RecommendationResults } from "./recommendation-results";

export const metadata: Metadata = {
  title: "내 노래 추천 순위 — Copy Singer",
  description: "내 보컬 프로필과 잘 맞는 100곡 전체 순위와 추천 노래방 키를 확인하세요.",
};

export default async function RecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageSession(`/recommendations/${id}`);
  return <RecommendationResults runId={id} ticketCost={mixingTicketCost()} />;
}
