import { withApiAdmission } from "@/_app/api-routes/admission";
import { getVocalProfileHistory } from "@/entities/vocal-profile/index.server";
import { MAX_PROFILE_ANALYSIS_AUDIO_BYTES } from "@/features/analyze-vocal-profile/index.model";
import {
  analysisJobPayload,
  enqueueVocalProfileAnalysis,
  preflightVocalProfileAnalysis,
} from "@/features/analyze-vocal-profile/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import {
  MultipartBodyTooLargeError,
  multipartBodyLimit,
  readBoundedMultipartFormData,
} from "@/shared/api/index.server";
import { AdmissionError, admissionResponse } from "@/shared/lib/admission/index.server";

async function handleGET(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const requestedPage = Number(new URL(request.url).searchParams.get("page") ?? "1");
  return Response.json(
    await getVocalProfileHistory(session.user.id, Number.isFinite(requestedPage) ? requestedPage : 1),
  );
}

function enqueueError(error: unknown) {
  if (error instanceof AdmissionError) return admissionResponse(error);
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
  if (code === "ANALYSIS_BUSY") {
    return Response.json(
      {
        reasonCode: code,
        detail: "Wait for the active vocal analysis to finish before starting another.",
        retryable: true,
      },
      { status: 429, headers: { "Retry-After": "10" } },
    );
  }
  return Response.json(
    { reasonCode: "ANALYSIS_ENQUEUE_FAILED", detail: "The analysis job could not be queued.", retryable: true },
    { status: 503 },
  );
}

async function handlePOST(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
  try {
    const existing = await preflightVocalProfileAnalysis(session.user.id, idempotencyKey);
    if (existing) return Response.json(analysisJobPayload(existing), { status: 202 });
  } catch (error) {
    return enqueueError(error);
  }
  let form: FormData;
  try {
    form = await readBoundedMultipartFormData(request, multipartBodyLimit(MAX_PROFILE_ANALYSIS_AUDIO_BYTES));
  } catch (error) {
    if (error instanceof MultipartBodyTooLargeError) return enqueueError(new Error("PAYLOAD_TOO_LARGE"));
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

export const GET = withApiAdmission(handleGET);

export const POST = withApiAdmission(handlePOST);
