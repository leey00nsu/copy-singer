import "server-only";

import { getGuestTrial } from "@/entities/guest-analysis/index.server";
import { getRequestSession } from "./session";

/** Trial capabilities never satisfy requireApiSession or requirePageSession. */
export async function getAnalysisActor(request?: Request) {
  const session = await getRequestSession(request);
  if (session) return { userId: session.user.id, guest: false as const };
  const headers = request?.headers ?? (await (await import("next/headers")).headers());
  const trial = await getGuestTrial(headers);
  return trial && !trial.claimedAt ? { userId: trial.userId, guest: true as const } : null;
}

/** A signed-in visitor can still view/delete their own unsaved trial using both proofs. */
export async function getAnalysisResourceActor(request: Request, resource: { jobId?: string; profileId?: string }) {
  const actor = await getAnalysisActor(request);
  if (!actor || actor.guest) return actor;
  const trial = await getGuestTrial(request.headers);
  const matches = resource.jobId ? trial?.jobId === resource.jobId : trial?.job?.vocalProfileId === resource.profileId;
  return trial && !trial.claimedAt && matches ? { userId: trial.userId, guest: true as const } : actor;
}
