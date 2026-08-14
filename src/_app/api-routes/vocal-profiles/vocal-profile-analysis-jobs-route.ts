import {
  ANALYSIS_AUDIO_MIME_TYPES,
  analysisAudioFileSchema,
  analysisIdempotencyKeySchema,
  MAX_PROFILE_ANALYSIS_AUDIO_BYTES,
} from "@/features/analyze-vocal-profile/index.model";
import {
  analysisJobPayload,
  enqueueVocalProfileAnalysis,
  listVisibleVocalProfileAnalysisJobs,
} from "@/features/analyze-vocal-profile/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import {
  MultipartBodyTooLargeError,
  multipartBodyLimit,
  readBoundedMultipartFormData,
} from "@/shared/api/index.server";

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
  if (code === "ANALYSIS_BUSY") {
    return Response.json(
      {
        reasonCode: code,
        detail: "Wait for the active vocal analysis to finish before starting another.",
        retryable: true,
      },
      { status: 409 },
    );
  }
  return Response.json(
    { reasonCode: "ANALYSIS_ENQUEUE_FAILED", detail: "The analysis job could not be queued.", retryable: true },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const jobs = await listVisibleVocalProfileAnalysisJobs(session.user.id);
  return Response.json({ jobs: jobs.map(analysisJobPayload) });
}

export async function POST(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
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
  const idempotencyResult = analysisIdempotencyKeySchema.safeParse(idempotencyKey);
  if (!idempotencyResult.success) return enqueueError(new Error("INVALID_IDEMPOTENCY_KEY"));

  const audioResult = analysisAudioFileSchema.safeParse(audio);
  if (!audioResult.success) {
    const normalizedMimeType = audio.type.split(";", 1)[0]?.trim().toLowerCase();
    if (!ANALYSIS_AUDIO_MIME_TYPES.some((mimeType) => mimeType === normalizedMimeType)) {
      return enqueueError(new Error("UNSUPPORTED_AUDIO"));
    }
    return enqueueError(new Error("PAYLOAD_TOO_LARGE"));
  }
  try {
    const job = await enqueueVocalProfileAnalysis({
      userId: session.user.id,
      idempotencyKey: idempotencyResult.data,
      file: audioResult.data,
    });
    return Response.json(analysisJobPayload(job), { status: 202 });
  } catch (error) {
    return enqueueError(error);
  }
}
