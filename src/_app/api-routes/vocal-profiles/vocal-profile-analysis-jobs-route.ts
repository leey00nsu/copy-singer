import { withApiAdmission } from "@/_app/api-routes/admission";
import { GuestAnalysisError, getGuestTrial, guestAnalysisPolicy } from "@/entities/guest-analysis/index.server";
import { InsufficientTicketsError } from "@/entities/ticket/index.server";
import {
  ANALYSIS_AUDIO_MIME_TYPES,
  analysisAudioFileSchema,
  analysisIdempotencyKeySchema,
  MAX_PROFILE_ANALYSIS_AUDIO_BYTES,
} from "@/features/analyze-vocal-profile/index.model";
import {
  analysisJobPayload,
  enqueueVocalProfileAnalysis,
  getVocalProfileAnalysisPolicy,
  listVisibleVocalProfileAnalysisJobs,
  preflightVocalProfileAnalysis,
} from "@/features/analyze-vocal-profile/index.server";
import { getAnalysisActor, unauthorizedResponse } from "@/features/authentication/index.server";
import {
  MultipartBodyTooLargeError,
  multipartBodyLimit,
  readBoundedMultipartFormData,
} from "@/shared/api/index.server";
import { guestAnalysisDailyLimit } from "@/shared/config/index.server";
import { AdmissionError, admissionResponse, guestAnalysisQuota } from "@/shared/lib/admission/index.server";

function enqueueError(error: unknown) {
  if (error instanceof AdmissionError) return admissionResponse(error);
  if (error instanceof GuestAnalysisError)
    return Response.json({ reasonCode: error.code, retryable: false }, { status: error.status });
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
  if (error instanceof InsufficientTicketsError && error.kind === "VOCAL_ANALYSIS") {
    return Response.json(
      {
        reasonCode: "INSUFFICIENT_ANALYSIS_TICKETS",
        detail: error.message,
        retryable: false,
      },
      { status: 402 },
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

async function handleGET(request: Request) {
  const actor = await getAnalysisActor(request);
  if (!actor || actor.guest) {
    const trial = await getGuestTrial(request.headers);
    const guest = guestAnalysisPolicy(trial, guestAnalysisQuota.policy(guestAnalysisDailyLimit()).available);
    const jobs =
      trial && !trial.claimedAt && trial.job && (!trial.expiresAt || trial.expiresAt.getTime() > Date.now())
        ? [analysisJobPayload(trial.job)]
        : [];
    return Response.json(
      { jobs, analysisTickets: { balance: 0, cost: 0 }, guest },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const [jobs, policy] = await Promise.all([
    listVisibleVocalProfileAnalysisJobs(actor.userId),
    getVocalProfileAnalysisPolicy(actor.userId),
  ]);
  return Response.json({ jobs: jobs.map(analysisJobPayload), ...policy });
}

async function handlePOST(request: Request) {
  const actor = await getAnalysisActor(request);
  if (!actor) return unauthorizedResponse();
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
  let reservation: ReturnType<typeof guestAnalysisQuota.reserve> | undefined;
  try {
    const existing = await preflightVocalProfileAnalysis(actor.userId, idempotencyKey);
    if (existing) return Response.json(analysisJobPayload(existing), { status: 202 });
    if (actor.guest) reservation = guestAnalysisQuota.reserve(guestAnalysisDailyLimit());
    return await uploadAnalysis(request, actor.userId, idempotencyKey, reservation);
  } catch (error) {
    return enqueueError(error);
  } finally {
    reservation?.release();
  }
}

async function uploadAnalysis(
  request: Request,
  userId: string,
  idempotencyKey: string,
  reservation?: ReturnType<typeof guestAnalysisQuota.reserve>,
) {
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
      userId,
      guestReservation: reservation,
      idempotencyKey: idempotencyResult.data,
      file: audioResult.data,
    });
    return Response.json(analysisJobPayload(job), { status: 202 });
  } catch (error) {
    return enqueueError(error);
  }
}

export const GET = withApiAdmission(handleGET, { allowGuest: true, allowPublic: true });

export const POST = withApiAdmission(handlePOST, { allowGuest: true });
