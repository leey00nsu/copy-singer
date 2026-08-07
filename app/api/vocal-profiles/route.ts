export const runtime = "nodejs";

import { prisma } from "@/lib/db/prisma";
import { RecordingKind, RecordingStatus, type Prisma } from "@/generated/prisma/client";
import { hasSmartReferenceContract } from "@/lib/vocal-profile/contract";
import { AnalyzerClientError, analyzeVocalProfile } from "@/lib/vocal-profile/analyzer";
import { serializeProfile } from "@/lib/vocal-profile/server";
import { requireApiSession, unauthorizedResponse } from "@/lib/auth/session";
import {
  discardMediaAsset,
  storeAnalyzerReferenceBytes,
  storeAnalyzerSynthesisReferenceBytes,
} from "@/lib/leemage/media-service";
import { LeemageError } from "@/lib/leemage/client";
import { getVocalProfileHistory } from "@/lib/vocal-profile/history";

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const requestedPage = Number(new URL(request.url).searchParams.get("page") ?? "1");
  return Response.json(await getVocalProfileHistory(
    session.user.id,
    Number.isFinite(requestedPage) ? requestedPage : 1,
  ));
}

export async function POST(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();

  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data") || !request.body) {
    return Response.json(
      { reasonCode: "INVALID_UPLOAD", detail: "Expected one multipart audio upload.", retryable: true },
      { status: 400 },
    );
  }

  const recordingId = crypto.randomUUID();
  let analyzed: Awaited<ReturnType<typeof analyzeVocalProfile>>;
  try {
    analyzed = await analyzeVocalProfile({
      recordingId,
      contentType,
      body: request.body,
    });
  } catch (error) {
    if (error instanceof AnalyzerClientError) {
      return Response.json(
        { reasonCode: error.reasonCode, detail: error.detail, retryable: error.retryable },
        { status: error.status },
      );
    }
    return Response.json(
      { reasonCode: "ANALYZER_UNAVAILABLE", detail: "Vocal analyzer is unavailable.", retryable: true },
      { status: 502 },
    );
  }

  const { profile, source, synthesisReference } = analyzed;
  if (profile.recordingId !== recordingId) {
    return Response.json(
      { reasonCode: "ANALYSIS_FAILED", detail: "Analyzer returned an invalid recording ID.", retryable: true },
      { status: 502 },
    );
  }

  if (!hasSmartReferenceContract(profile)) {
    return Response.json(
      {
        reasonCode: "ANALYZER_UPDATE_REQUIRED",
        detail: "The configured vocal analyzer does not support the required smart reference contract.",
        retryable: false,
      },
      { status: 502 },
    );
  }

  let mediaAsset: Awaited<ReturnType<typeof storeAnalyzerReferenceBytes>>;
  try {
    mediaAsset = await storeAnalyzerReferenceBytes({
      userId: session.user.id,
      recordingId,
      mimeType: source.mimeType,
      bytes: source.bytes,
      fileName: source.fileName,
    });
  } catch (error) {
    const storageError = error instanceof LeemageError ? error : null;
    return Response.json(
      {
        reasonCode: storageError?.status === null && !storageError.retryable ? "STORAGE_NOT_CONFIGURED" : "STORAGE_UPLOAD_FAILED",
        detail: "Analysis finished but the reference audio could not be stored.",
        retryable: storageError?.retryable ?? true,
      },
      { status: storageError?.status === null && !storageError.retryable ? 503 : 502 },
    );
  }

  let synthesisReferenceAsset: Awaited<ReturnType<typeof storeAnalyzerSynthesisReferenceBytes>> | null = null;
  if (profile.synthesisReference) {
    if (!synthesisReference) {
      await discardMediaAsset(mediaAsset.id);
      return Response.json(
        {
          reasonCode: "ANALYZER_INVALID_RESPONSE",
          detail: "Analyzer response omitted the smart synthesis reference artifact.",
          retryable: true,
        },
        { status: 502 },
      );
    }
    try {
      synthesisReferenceAsset = await storeAnalyzerSynthesisReferenceBytes({
        userId: session.user.id,
        recordingId,
        mimeType: synthesisReference.mimeType,
        bytes: synthesisReference.bytes,
        fileName: synthesisReference.fileName,
      });
      profile.descriptors.synthesisReferenceStorage = { status: "ready", kind: "SYNTHESIS_REFERENCE" };
    } catch (error) {
      console.warn("Could not store smart synthesis reference; source fallback remains available", error instanceof Error ? error.message : "unknown error");
      profile.descriptors.synthesisReferenceStorage = {
        status: "failed",
        fallback: "analysis-source",
      };
    }
  }

  try {
    await prisma.vocalProfile.create({
      data: {
        user: { connect: { id: session.user.id } },
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
            id: recordingId,
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
    const storedProfile = await prisma.vocalProfile.findFirstOrThrow({
      where: { recordingId, userId: session.user.id },
      include: { recording: true },
    });
    return Response.json(serializeProfile(storedProfile), { status: 201 });
  } catch (error) {
    console.error("Could not persist vocal profile", error instanceof Error ? error.message : "unknown error");
    await Promise.all([
      discardMediaAsset(mediaAsset.id),
      ...(synthesisReferenceAsset ? [discardMediaAsset(synthesisReferenceAsset.id)] : []),
    ]);
    return Response.json(
      { reasonCode: "PROFILE_SAVE_FAILED", detail: "Analysis finished but the profile could not be saved.", retryable: true },
      { status: 500 },
    );
  }
}
