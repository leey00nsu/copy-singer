import "server-only";

import { prisma } from "@/shared/db/index.server";

export async function listAdminCustomMixingProfiles(userId: string) {
  const rows = await prisma.vocalProfile.findMany({
    where: { userId, sourceType: "USER" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      profileNumber: true,
      displayName: true,
      synthesisReferenceAsset: { select: { userId: true, kind: true, status: true } },
      recording: { select: { mediaAsset: { select: { userId: true, kind: true, status: true } } } },
    },
  });

  return rows.map((row) => {
    const synthesisReady =
      row.synthesisReferenceAsset?.userId === userId &&
      row.synthesisReferenceAsset.kind === "SYNTHESIS_REFERENCE" &&
      row.synthesisReferenceAsset.status === "READY";
    const sourceReady =
      row.recording.mediaAsset?.userId === userId &&
      row.recording.mediaAsset.kind === "REFERENCE" &&
      row.recording.mediaAsset.status === "READY";
    return {
      id: row.id,
      profileNumber: row.profileNumber,
      displayName: row.displayName?.trim() || `보컬 프로필 ${row.profileNumber ?? 1}`,
      referenceKind: synthesisReady ? ("SYNTHESIS_REFERENCE" as const) : sourceReady ? ("REFERENCE" as const) : null,
      referenceReady: synthesisReady || sourceReady,
    };
  });
}

export async function getAdminCustomMixingReference(userId: string, profileId: string) {
  const row = await prisma.vocalProfile.findFirst({
    where: { id: profileId, userId, sourceType: "USER" },
    select: {
      id: true,
      synthesisReferenceAsset: {
        select: { userId: true, kind: true, status: true, externalUrl: true, mimeType: true, fileName: true },
      },
      recording: {
        select: {
          mediaAsset: {
            select: { userId: true, kind: true, status: true, externalUrl: true, mimeType: true, fileName: true },
          },
        },
      },
    },
  });
  if (!row) return null;

  const synthesis = row.synthesisReferenceAsset;
  if (synthesis?.userId === userId && synthesis.kind === "SYNTHESIS_REFERENCE" && synthesis.status === "READY") {
    return {
      profileId: row.id,
      externalUrl: synthesis.externalUrl,
      mimeType: synthesis.mimeType,
      fileName: synthesis.fileName,
    };
  }
  const source = row.recording.mediaAsset;
  if (source?.userId === userId && source.kind === "REFERENCE" && source.status === "READY") {
    return { profileId: row.id, externalUrl: source.externalUrl, mimeType: source.mimeType, fileName: source.fileName };
  }
  return null;
}
