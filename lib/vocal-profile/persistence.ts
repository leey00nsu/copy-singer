import "server-only";

import { type Prisma, RecordingKind, RecordingStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { LeemageError } from "@/lib/leemage/client";
import {
  discardMediaAsset,
  storeAnalyzerReferenceBytes,
  storeAnalyzerSynthesisReferenceBytes,
} from "@/lib/leemage/media-service";
import type { AnalyzedRecording } from "@/lib/vocal-profile/analyzer";

export class VocalProfilePersistenceError extends Error {
  constructor(
    readonly reasonCode: string,
    readonly detail: string,
    readonly retryable: boolean,
    readonly status: number,
  ) {
    super(detail);
    this.name = "VocalProfilePersistenceError";
  }
}

export async function persistAnalyzedVocalProfile(input: {
  userId: string;
  recordingId: string;
  analyzed: AnalyzedRecording;
}) {
  const { profile, source, synthesisReference } = input.analyzed;

  let mediaAsset: Awaited<ReturnType<typeof storeAnalyzerReferenceBytes>>;
  try {
    mediaAsset = await storeAnalyzerReferenceBytes({
      userId: input.userId,
      recordingId: input.recordingId,
      mimeType: source.mimeType,
      bytes: source.bytes,
      fileName: source.fileName,
    });
  } catch (error) {
    const storageError = error instanceof LeemageError ? error : null;
    throw new VocalProfilePersistenceError(
      storageError?.status === null && !storageError.retryable ? "STORAGE_NOT_CONFIGURED" : "STORAGE_UPLOAD_FAILED",
      "Analysis finished but the reference audio could not be stored.",
      storageError?.retryable ?? true,
      storageError?.status === null && !storageError.retryable ? 503 : 502,
    );
  }

  let synthesisReferenceAsset: Awaited<ReturnType<typeof storeAnalyzerSynthesisReferenceBytes>> | null = null;
  if (profile.synthesisReference) {
    if (!synthesisReference) {
      await discardMediaAsset(mediaAsset.id);
      throw new VocalProfilePersistenceError(
        "ANALYZER_INVALID_RESPONSE",
        "Analyzer response omitted the smart synthesis reference artifact.",
        true,
        502,
      );
    }
    try {
      synthesisReferenceAsset = await storeAnalyzerSynthesisReferenceBytes({
        userId: input.userId,
        recordingId: input.recordingId,
        mimeType: synthesisReference.mimeType,
        bytes: synthesisReference.bytes,
        fileName: synthesisReference.fileName,
      });
      profile.descriptors.synthesisReferenceStorage = { status: "ready", kind: "SYNTHESIS_REFERENCE" };
    } catch (error) {
      console.warn(
        "Could not store smart synthesis reference; source fallback remains available",
        error instanceof Error ? error.message : "unknown error",
      );
      profile.descriptors.synthesisReferenceStorage = {
        status: "failed",
        fallback: "analysis-source",
      };
    }
  }

  try {
    await prisma.vocalProfile.create({
      data: {
        user: { connect: { id: input.userId } },
        sourceType: "USER",
        minMidi: profile.minMidi,
        maxMidi: profile.maxMidi,
        p10Midi: profile.p10Midi,
        medianMidi: profile.medianMidi,
        p90Midi: profile.p90Midi,
        tessituraLowMidi: profile.tessituraLowMidi,
        tessituraHighMidi: profile.tessituraHighMidi,
        voicedRatio: profile.voicedRatio,
        pitchStability: profile.pitchStability,
        clippingRatio: profile.clippingRatio,
        rmsDb: profile.rmsDb,
        descriptors: profile.descriptors as Prisma.InputJsonValue,
        analyzer: profile.analyzer,
        analyzerVersion: profile.analyzerVersion,
        ...(synthesisReferenceAsset
          ? { synthesisReferenceAsset: { connect: { id: synthesisReferenceAsset.id } } }
          : {}),
        recording: {
          create: {
            id: input.recordingId,
            kind: RecordingKind.USER_TEST,
            storagePath: `leemage://${mediaAsset.externalProjectId}/${mediaAsset.externalFileId}`,
            mimeType: profile.mimeType,
            durationMs: profile.durationMs,
            sizeBytes: BigInt(profile.sizeBytes),
            sampleRate: profile.sampleRate,
            status: RecordingStatus.READY,
            expiresAt: null,
            mediaAsset: { connect: { id: mediaAsset.id } },
          },
        },
      },
    });
    return prisma.vocalProfile.findFirstOrThrow({
      where: { recordingId: input.recordingId, userId: input.userId },
      include: { recording: true },
    });
  } catch (error) {
    console.error("Could not persist vocal profile", error instanceof Error ? error.message : "unknown error");
    await Promise.all([
      discardMediaAsset(mediaAsset.id),
      ...(synthesisReferenceAsset ? [discardMediaAsset(synthesisReferenceAsset.id)] : []),
    ]);
    throw new VocalProfilePersistenceError(
      "PROFILE_SAVE_FAILED",
      "Analysis finished but the profile could not be saved.",
      true,
      500,
    );
  }
}

export async function persistQueuedAnalyzedVocalProfile(input: {
  userId: string;
  recordingId: string;
  sourceAssetId: string;
  analyzed: AnalyzedRecording;
}) {
  const existing = await prisma.vocalProfile.findFirst({
    where: { recordingId: input.recordingId, userId: input.userId },
    include: { recording: true },
  });
  if (existing) return existing;

  const sourceAsset = await prisma.mediaAsset.findFirst({
    where: { id: input.sourceAssetId, userId: input.userId, kind: "REFERENCE", status: "READY" },
  });
  if (!sourceAsset) {
    throw new VocalProfilePersistenceError(
      "ANALYSIS_SOURCE_MISSING",
      "The queued analysis source is no longer available.",
      false,
      410,
    );
  }

  const { profile, source, synthesisReference } = input.analyzed;
  if (sourceAsset.mimeType !== source.mimeType || sourceAsset.sizeBytes !== BigInt(source.bytes.byteLength)) {
    throw new VocalProfilePersistenceError(
      "ANALYZER_SOURCE_MISMATCH",
      "Analyzer source metadata does not match the queued source.",
      false,
      502,
    );
  }

  let synthesisReferenceAsset: Awaited<ReturnType<typeof storeAnalyzerSynthesisReferenceBytes>> | null = null;
  if (profile.synthesisReference) {
    if (!synthesisReference) {
      throw new VocalProfilePersistenceError(
        "ANALYZER_INVALID_RESPONSE",
        "Analyzer response omitted the smart synthesis reference artifact.",
        true,
        502,
      );
    }
    try {
      synthesisReferenceAsset = await storeAnalyzerSynthesisReferenceBytes({
        userId: input.userId,
        recordingId: input.recordingId,
        mimeType: synthesisReference.mimeType,
        bytes: synthesisReference.bytes,
        fileName: synthesisReference.fileName,
      });
      profile.descriptors.synthesisReferenceStorage = { status: "ready", kind: "SYNTHESIS_REFERENCE" };
    } catch (error) {
      console.warn(
        "Could not store smart synthesis reference; source fallback remains available",
        error instanceof Error ? error.message : "unknown error",
      );
      profile.descriptors.synthesisReferenceStorage = { status: "failed", fallback: "analysis-source" };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const raced = await tx.vocalProfile.findFirst({
        where: { recordingId: input.recordingId, userId: input.userId },
        select: { id: true },
      });
      if (raced) return;
      await tx.recording.create({
        data: {
          id: input.recordingId,
          kind: RecordingKind.USER_TEST,
          storagePath: `leemage://${sourceAsset.externalProjectId}/${sourceAsset.externalFileId}`,
          mimeType: profile.mimeType,
          durationMs: profile.durationMs,
          sizeBytes: BigInt(profile.sizeBytes),
          sampleRate: profile.sampleRate,
          status: RecordingStatus.READY,
          expiresAt: null,
          mediaAsset: { connect: { id: sourceAsset.id } },
        },
      });
      await tx.vocalProfile.create({
        data: {
          user: { connect: { id: input.userId } },
          sourceType: "USER",
          recording: { connect: { id: input.recordingId } },
          minMidi: profile.minMidi,
          maxMidi: profile.maxMidi,
          p10Midi: profile.p10Midi,
          medianMidi: profile.medianMidi,
          p90Midi: profile.p90Midi,
          tessituraLowMidi: profile.tessituraLowMidi,
          tessituraHighMidi: profile.tessituraHighMidi,
          voicedRatio: profile.voicedRatio,
          pitchStability: profile.pitchStability,
          clippingRatio: profile.clippingRatio,
          rmsDb: profile.rmsDb,
          descriptors: profile.descriptors as Prisma.InputJsonValue,
          analyzer: profile.analyzer,
          analyzerVersion: profile.analyzerVersion,
          ...(synthesisReferenceAsset
            ? { synthesisReferenceAsset: { connect: { id: synthesisReferenceAsset.id } } }
            : {}),
        },
      });
    });
    const stored = await prisma.vocalProfile.findFirstOrThrow({
      where: { recordingId: input.recordingId, userId: input.userId },
      include: { recording: true },
    });
    return stored;
  } catch {
    if (synthesisReferenceAsset) await discardMediaAsset(synthesisReferenceAsset.id);
    const raced = await prisma.vocalProfile.findFirst({
      where: { recordingId: input.recordingId, userId: input.userId },
      include: { recording: true },
    });
    if (raced) return raced;
    throw new VocalProfilePersistenceError(
      "PROFILE_SAVE_FAILED",
      "Analysis finished but the profile could not be saved.",
      true,
      500,
    );
  }
}
