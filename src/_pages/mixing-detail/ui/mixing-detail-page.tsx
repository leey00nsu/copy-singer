import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMixingJobForUser } from "@/entities/mixing-job/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { resourceIdSchema } from "@/shared/api";
import { MixingDetail } from "./mixing-detail";

export const metadata: Metadata = {
  title: "AI 믹스 상세 — Copy Singer",
  description: "AI 믹싱의 실제 처리 상태와 완성된 결과를 확인하세요.",
};

export default async function MixingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePageSession(`/library/mixes/${id}`);
  const parsedId = resourceIdSchema.safeParse(id);
  if (!parsedId.success) notFound();
  const job = await getMixingJobForUser(session.user.id, parsedId.data);
  if (!job) notFound();
  return <MixingDetail initial={job} />;
}
