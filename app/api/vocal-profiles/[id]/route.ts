export const runtime = "nodejs";

import { prisma } from "@/lib/db/prisma";
import { deleteAnalyzerRecording, serializeProfile } from "@/lib/vocal-profile/server";
import { requireApiSession, unauthorizedResponse } from "@/lib/auth/session";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const { id } = await context.params;
  const profile = await prisma.vocalProfile.findFirst({
    where: { id, userId: session.user.id },
    include: { recording: true },
  });
  if (!profile || profile.sourceType !== "USER") {
    return Response.json({ reasonCode: "PROFILE_NOT_FOUND", detail: "Vocal profile was not found.", retryable: false }, { status: 404 });
  }
  return Response.json(serializeProfile(profile));
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const { id } = await context.params;
  const profile = await prisma.vocalProfile.findFirst({
    where: { id, userId: session.user.id },
    include: { recording: true, recommendationRuns: { select: { id: true }, take: 1 } },
  });
  if (!profile || profile.sourceType !== "USER") {
    return Response.json({ reasonCode: "PROFILE_NOT_FOUND", detail: "Vocal profile was not found.", retryable: false }, { status: 404 });
  }
  if (profile.recommendationRuns.length > 0) {
    return Response.json(
      { reasonCode: "PROFILE_IN_USE", detail: "Delete related recommendations before this profile.", retryable: false },
      { status: 409 },
    );
  }

  const fileDeleted = await deleteAnalyzerRecording(profile.recordingId);
  if (!fileDeleted) {
    return Response.json(
      { reasonCode: "ANALYZER_UNAVAILABLE", detail: "The stored recording could not be removed.", retryable: true },
      { status: 502 },
    );
  }

  await prisma.$transaction([
    prisma.vocalProfile.delete({ where: { id: profile.id } }),
    prisma.recording.delete({ where: { id: profile.recordingId } }),
  ]);
  return Response.json({ status: "deleted", id });
}
