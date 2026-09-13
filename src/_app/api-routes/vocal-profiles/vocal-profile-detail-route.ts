import { withApiAdmission } from "@/_app/api-routes/admission";
import { vocalProfileRenameRequestSchema } from "@/entities/vocal-profile";
import { serializeProfile } from "@/entities/vocal-profile/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { resourceIdSchema } from "@/shared/api";
import { readBoundedJson } from "@/shared/api/index.server";
import { prisma } from "@/shared/db/index.server";
import { processMediaOperation, scheduleAssetDeletion } from "@/shared/media/index.server";

function profileNotFoundResponse() {
  return Response.json(
    { reasonCode: "PROFILE_NOT_FOUND", detail: "Vocal profile was not found.", retryable: false },
    { status: 404 },
  );
}

async function handleGET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const parsedId = resourceIdSchema.safeParse((await context.params).id);
  if (!parsedId.success) return profileNotFoundResponse();
  const id = parsedId.data;
  const profile = await prisma.vocalProfile.findFirst({
    where: { id, userId: session.user.id },
    include: { recording: true },
  });
  if (profile?.sourceType !== "USER") {
    return profileNotFoundResponse();
  }
  return Response.json(serializeProfile(profile));
}

async function handlePATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const parsedId = resourceIdSchema.safeParse((await context.params).id);
  if (!parsedId.success) return profileNotFoundResponse();
  const parsedBody = vocalProfileRenameRequestSchema.safeParse(await readBoundedJson(request).catch(() => null));
  if (!parsedBody.success) {
    return Response.json(
      {
        reasonCode: "INVALID_PROFILE_NAME",
        detail: parsedBody.error.issues[0]?.message ?? "Vocal profile name is invalid.",
        retryable: false,
      },
      { status: 400 },
    );
  }
  const profile = await prisma.vocalProfile.findFirst({
    where: { id: parsedId.data, userId: session.user.id, sourceType: "USER" },
    select: { id: true },
  });
  if (!profile) return profileNotFoundResponse();
  const updated = await prisma.vocalProfile.update({
    where: { id: profile.id },
    data: { displayName: parsedBody.data.displayName },
    select: { id: true },
  });
  return Response.json({ id: updated.id, displayName: parsedBody.data.displayName });
}

async function handleDELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const parsedId = resourceIdSchema.safeParse((await context.params).id);
  if (!parsedId.success) return profileNotFoundResponse();
  const id = parsedId.data;
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "VocalProfile" WHERE id = ${id}::uuid AND "userId" = ${session.user.id} FOR UPDATE`;
    const profile = await tx.vocalProfile.findFirst({
      where: { id, userId: session.user.id, sourceType: "USER" },
      include: { recording: true, _count: { select: { mixingJobs: true } } },
    });
    if (!profile) return { error: "NOT_FOUND" as const };
    if (profile._count.mixingJobs > 0) return { error: "IN_USE" as const };
    const assets = [profile.recording.mediaAssetId, profile.synthesisReferenceAssetId].filter(
      (asset): asset is string => Boolean(asset),
    );
    await tx.vocalProfile.delete({ where: { id } });
    await tx.recording.delete({ where: { id: profile.recordingId } });
    await tx.vocalProfileAnalysisJob.updateMany({
      where: { recordingId: profile.recordingId, status: { in: ["SUCCEEDED", "FAILED"] } },
      data: { sourceAssetId: null },
    });
    const operations: string[] = [];
    for (const assetId of new Set(assets)) {
      const operationId = await scheduleAssetDeletion(tx, assetId);
      if (operationId) operations.push(operationId);
    }
    return { operations };
  });
  if (result.error === "NOT_FOUND") return profileNotFoundResponse();
  if (result.error === "IN_USE")
    return Response.json(
      { reasonCode: "PROFILE_IN_USE", detail: "Delete related mixing jobs before this profile.", retryable: false },
      { status: 409 },
    );
  for (const operationId of result.operations ?? []) await processMediaOperation(operationId);
  const cleanupPending =
    (await prisma.mediaOperation.count({
      where: { id: { in: result.operations ?? [] }, status: { not: "COMPLETED" } },
    })) > 0;
  return Response.json(
    { status: "deleted", id, mediaCleanupPending: cleanupPending },
    { status: cleanupPending ? 202 : 200 },
  );
}

export const GET = withApiAdmission(handleGET);

export const PATCH = withApiAdmission(handlePATCH);

export const DELETE = withApiAdmission(handleDELETE);
