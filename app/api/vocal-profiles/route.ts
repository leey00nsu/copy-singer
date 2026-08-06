export const runtime = "nodejs";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { AnalyzerProfile } from "@/lib/vocal-profile/contract";
import { analyzerUrl, deleteAnalyzerRecording, serializeProfile } from "@/lib/vocal-profile/server";

export async function POST(request: Request) {
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

  try {
    await prisma.vocalProfile.create({
      data: {
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
        recording: {
          create: {
            id: recordingId,
            kind: "USER_TEST",
            storagePath: analyzed.storagePath,
            mimeType: analyzed.mimeType,
            durationMs: analyzed.durationMs,
            sizeBytes: BigInt(analyzed.sizeBytes),
            sampleRate: analyzed.sampleRate,
            status: "READY",
            expiresAt: new Date(analyzed.expiresAt),
          },
        },
      },
    });
    const profile = await prisma.vocalProfile.findFirstOrThrow({
      where: { recordingId },
      include: { recording: true },
    });
    return Response.json(serializeProfile(profile), { status: 201 });
  } catch (error) {
    console.error("Could not persist vocal profile", error instanceof Error ? error.message : "unknown error");
    await deleteAnalyzerRecording(recordingId);
    return Response.json(
      { reasonCode: "PROFILE_SAVE_FAILED", detail: "Analysis finished but the profile could not be saved.", retryable: true },
      { status: 500 },
    );
  }
}
