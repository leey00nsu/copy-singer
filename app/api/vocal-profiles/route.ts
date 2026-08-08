export const runtime = "nodejs";

import { AnalyzerClientError, analyzeVocalProfile } from "@/lib/vocal-profile/analyzer";
import { serializeProfile } from "@/lib/vocal-profile/server";
import { requireApiSession, unauthorizedResponse } from "@/lib/auth/session";
import { getVocalProfileHistory } from "@/lib/vocal-profile/history";
import { persistAnalyzedVocalProfile, VocalProfilePersistenceError } from "@/lib/vocal-profile/persistence";

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

  try {
    const storedProfile = await persistAnalyzedVocalProfile({
      userId: session.user.id,
      recordingId,
      analyzed,
    });
    return Response.json(serializeProfile(storedProfile), { status: 201 });
  } catch (error) {
    if (error instanceof VocalProfilePersistenceError) {
      return Response.json(
        { reasonCode: error.reasonCode, detail: error.detail, retryable: error.retryable },
        { status: error.status },
      );
    }
    return Response.json(
      { reasonCode: "PROFILE_SAVE_FAILED", detail: "Analysis finished but the profile could not be saved.", retryable: true },
      { status: 500 },
    );
  }
}
