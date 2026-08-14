import { notFound } from "next/navigation";
import { getVocalProfileDetail } from "@/entities/vocal-profile/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { VocalProfileDetailContent } from "./vocal-profile-detail-content";

export default async function VocalProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePageSession(`/vocal-profiles/${id}`);
  const detail = await getVocalProfileDetail(session.user.id, id);
  if (!detail) notFound();
  return <VocalProfileDetailContent detail={detail} />;
}
