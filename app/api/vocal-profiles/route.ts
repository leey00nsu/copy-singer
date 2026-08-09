export const runtime = "nodejs";

import { getVocalProfileHistory } from "@/entities/vocal-profile/index.server";
import { analysisJobPayload, enqueueVocalProfileAnalysis } from "@/features/analyze-vocal-profile/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const requestedPage = Number(new URL(request.url).searchParams.get("page") ?? "1");
  return Response.json(
    await getVocalProfileHistory(session.user.id, Number.isFinite(requestedPage) ? requestedPage : 1),
  );
}

function enqueueError(error: unknown) {
  const code = error instanceof Error ? error.message : "ANALYSIS_ENQUEUE_FAILED";
  if (code === "INVALID_IDEMPOTENCY_KEY") {
    return Response.json(
      { reasonCode: code, detail: "A valid Idempotency-Key header is required.", retryable: false },
      { status: 400 },
    );
  }
  if (code === "UNSUPPORTED_AUDIO") {
    return Response.json(
      { reasonCode: code, detail: "Use a WAV, MP3, M4A, or WebM audio file.", retryable: false },
      { status: 415 },
    );
  }
  if (code === "PAYLOAD_TOO_LARGE") {
    return Response.json(
      { reasonCode: code, detail: "Audio must be 25 MB or smaller.", retryable: false },
      { status: 413 },
    );
  }
  return Response.json(
    { reasonCode: "ANALYSIS_ENQUEUE_FAILED", detail: "The analysis job could not be queued.", retryable: true },
    { status: 503 },
  );
}

export async function POST(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { reasonCode: "INVALID_UPLOAD", detail: "Expected one multipart audio upload.", retryable: false },
      { status: 400 },
    );
  }
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return Response.json(
      { reasonCode: "INVALID_UPLOAD", detail: "Expected one multipart audio upload.", retryable: false },
      { status: 400 },
    );
  }
  try {
    const job = await enqueueVocalProfileAnalysis({ userId: session.user.id, idempotencyKey, file: audio });
    return Response.json(analysisJobPayload(job), { status: 202 });
  } catch (error) {
    return enqueueError(error);
  }
}
