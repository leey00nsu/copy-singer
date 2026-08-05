import type { Metadata } from "next";
import { RecommendationResults } from "@/components/recommendation-results";

export const metadata: Metadata = {
  title: "추천 노래 3곡 — Copy Singer",
  description: "내 보컬 프로필과 잘 맞는 노래와 추천 노래방 키를 확인하세요.",
};

export default async function RecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  return <RecommendationResults runId={(await params).id} />;
}
