export const runtime = "nodejs";

import { prisma } from "@/lib/db/prisma";
import { RecordingKind, RecordingStatus, type Prisma } from "@/generated/prisma/client";
import { hasSmartReferenceContract, type AnalyzerProfile } from "@/lib/vocal-profile/contract";
import { analyzerUrl, deleteAnalyzerRecording, serializeProfile } from "@/lib/vocal-profile/server";
import { requireApiSession, unauthorizedResponse } from "@/lib/auth/session";
import { discardMediaAsset, storeAnalyzerReference, storeAnalyzerSynthesisReference } from "@/lib/leemage/media-service";
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

  const url = analyzerUrl();
  if (!url) {
    return Response.json(
      { reasonCode: "ANALYZER_NOT_CONFIGURED", detail: "Local vocal analyzer is not configured.", retryable: false },
      { status: 503 },
    );
  }

  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data") || !request.body) {
    return Response.json(
      { reasonCode: "INVALID_UPLOAD", detail: "Expected one multipart audio upload.", retryable: true },
      { status: 400 },
    );
  }

  const recordingId = crypto.randomUUID();
  const upstreamRequest: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-Recording-ID": recordingId,
    },
    body: request.body,
    duplex: "half",
    cache: "no-store",
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${url}/v1/analyze`, upstreamRequest);
  } catch {
    return Response.json(
      { reasonCode: "ANALYZER_UNAVAILABLE", detail: "Local vocal analyzer is unavailable.", retryable: true },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  }

  const analyzed = (await upstream.json()) as AnalyzerProfile;
  if (analyzed.recordingId !== recordingId) {
    await deleteAnalyzerRecording(recordingId);
    return Response.json(
      { reasonCode: "ANALYSIS_FAILED", detail: "Analyzer returned an invalid recording ID.", retryable: true },
      { status: 502 },
    );
  }

  if (!hasSmartReferenceContract(analyzed)) {
    await deleteAnalyzerRecording(recordingId);
    return Response.json(
      {
        reasonCode: "ANALYZER_UPDATE_REQUIRED",
        detail: "The local vocal analyzer does not support smart reference regions. Rebuild the vocal-profile-api container and try again.",
        retryable: false,
      },
      { status: 502 },
    );
  }

  let mediaAsset: Awaited<ReturnType<typeof storeAnalyzerReference>>;
  try {
    mediaAsset = await storeAnalyzerReference({
      userId: session.user.id,
      recordingId,
      mimeType: analyzed.mimeType,
    });
  } catch (error) {
    await deleteAnalyzerRecording(recordingId);
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

  let synthesisReferenceAsset: Awaited<ReturnType<typeof storeAnalyzerSynthesisReference>> | null = null;
  if (analyzed.synthesisReference) {
    try {
      synthesisReferenceAsset = await storeAnalyzerSynthesisReference({
        userId: session.user.id,
        recordingId,
      });
      analyzed.descriptors.synthesisReferenceStorage = { status: "ready", kind: "SYNTHESIS_REFERENCE" };
    } catch (error) {
      console.warn("Could not store smart synthesis reference; source fallback remains available", error instanceof Error ? error.message : "unknown error");
      analyzed.descriptors.synthesisReferenceStorage = {
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
        minMidi: analyzed.minMidi,
        maxMidi: analyzed.maxMidi,
        p10Midi: analyzed.p10Midi,
        medianMidi: analyzed.medianMidi,
        p90Midi: analyzed.p90Midi,
        tessituraLowMidi: analyzed.tessituraLowMidi,
        tessituraHighMidi: analyzed.tessituraHighMidi,
        voicedRatio: analyzed.voicedRatio,
        pitchStability: analyzed.pitchStability,
        clippingRatio: analyzed.clippingRatio,
        rmsDb: analyzed.rmsDb,
        descriptors: analyzed.descriptors as Prisma.InputJsonValue,
        analyzer: analyzed.analyzer,
        analyzerVersion: analyzed.analyzerVersion,
        ...(synthesisReferenceAsset
          ? { synthesisReferenceAsset: { connect: { id: synthesisReferenceAsset.id } } }
          : {}),
        recording: {
          create: {
            id: recordingId,
            kind: RecordingKind.USER_TEST,
            storagePath: `leemage://${mediaAsset.externalProjectId}/${mediaAsset.externalFileId}`,
            mimeType: analyzed.mimeType,
            durationMs: analyzed.durationMs,
            sizeBytes: BigInt(analyzed.sizeBytes),
            sampleRate: analyzed.sampleRate,
            status: RecordingStatus.READY,
            expiresAt: null,
            mediaAsset: { connect: { id: mediaAsset.id } },
          },
        },
      },
    });
    const profile = await prisma.vocalProfile.findFirstOrThrow({
      where: { recordingId, userId: session.user.id },
      include: { recording: true },
    });
    await deleteAnalyzerRecording(recordingId);
    return Response.json(serializeProfile(profile), { status: 201 });
  } catch (error) {
    console.error("Could not persist vocal profile", error instanceof Error ? error.message : "unknown error");
    await deleteAnalyzerRecording(recordingId);
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
