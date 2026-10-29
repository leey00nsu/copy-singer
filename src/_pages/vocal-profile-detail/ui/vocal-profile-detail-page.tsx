import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getGuestTrial, guestTrialIsReadable } from "@/entities/guest-analysis/index.server";
import { getVocalProfileDetail } from "@/entities/vocal-profile/index.server";
import { getRequestSession, requirePageSession } from "@/features/authentication/index.server";
import { VocalProfileDetailContent } from "./vocal-profile-detail-content";

export default async function VocalProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getRequestSession();
  if (session) {
    const detail = await getVocalProfileDetail(session.user.id, id);
    if (detail) return <VocalProfileDetailContent detail={detail} />;
  }
  const trial = await getGuestTrial(await headers());
  if (!session && !trial) await requirePageSession(`/vocal-profiles/${id}`);
  if (!trial || !guestTrialIsReadable(trial) || trial.job?.vocalProfileId !== id) notFound();
  const detail = await getVocalProfileDetail(trial.userId, id);
  if (!detail) notFound();
  return <VocalProfileDetailContent detail={detail} guest signedIn={Boolean(session)} />;
}
