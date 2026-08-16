import { vocalProfileRenameRequestSchema } from "@/entities/vocal-profile";
import { serializeProfile } from "@/entities/vocal-profile/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { resourceIdSchema } from "@/shared/api";
import { prisma } from "@/shared/db/index.server";
import { deleteOrScheduleMediaAsset } from "@/shared/media/index.server";

function profileNotFoundResponse() {
  return Response.json(
    { reasonCode: "PROFILE_NOT_FOUND", detail: "Vocal profile was not found.", retryable: false },
    { status: 404 },
  );
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const parsedId = resourceIdSchema.safeParse((await context.params).id);
  if (!parsedId.success) return profileNotFoundResponse();
  const parsedBody = vocalProfileRenameRequestSchema.safeParse(await request.json().catch(() => null));
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

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const parsedId = resourceIdSchema.safeParse((await context.params).id);
  if (!parsedId.success) return profileNotFoundResponse();
  const id = parsedId.data;
  const profile = await prisma.vocalProfile.findFirst({
    where: { id, userId: session.user.id },
    include: {
      recording: { include: { mediaAsset: true } },
      synthesisReferenceAsset: true,
      _count: { select: { mixingJobs: true } },
    },
  });
  if (profile?.sourceType !== "USER") {
    return profileNotFoundResponse();
  }
  if (profile._count.mixingJobs > 0) {
    return Response.json(
      { reasonCode: "PROFILE_IN_USE", detail: "Delete related mixing jobs before this profile.", retryable: false },
      { status: 409 },
    );
  }

  const assets = [profile.recording.mediaAsset, profile.synthesisReferenceAsset].filter(
    (asset): asset is NonNullable<typeof asset> => asset !== null,
  );
  const deletions = await Promise.all(assets.map((asset) => deleteOrScheduleMediaAsset(asset.id)));
  await prisma.$transaction([
    prisma.vocalProfile.delete({ where: { id: profile.id } }),
    prisma.recording.delete({ where: { id: profile.recordingId } }),
    prisma.mediaAsset.deleteMany({
      where: { id: { in: assets.filter((_, index) => deletions[index].deleted).map((asset) => asset.id) } },
    }),
  ]);
  const cleanupPending = deletions.some((deletion) => !deletion.deleted);
  return Response.json(
    { status: "deleted", id, mediaCleanupPending: cleanupPending },
    { status: cleanupPending ? 202 : 200 },
  );
}
