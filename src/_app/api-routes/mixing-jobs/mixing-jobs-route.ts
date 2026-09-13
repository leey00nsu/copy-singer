import { withApiAdmission } from "@/_app/api-routes/admission";
import {
  getMixingHistory,
  MixingError,
  mixingHistoryFiltersSchema,
  serializeMixingJob,
} from "@/entities/mixing-job/index.server";
import { InsufficientTicketsError } from "@/entities/ticket/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { createMixingRequestSchema } from "@/features/create-mixing/index.model";
import { enqueueMixingJob } from "@/features/create-mixing/index.server";
import { readBoundedJson } from "@/shared/api/index.server";
import { AdmissionError, admissionResponse } from "@/shared/lib/admission/index.server";

async function handleGET(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const searchParams = new URL(request.url).searchParams;
  const filters = mixingHistoryFiltersSchema.parse({
    page: searchParams.get("page"),
    q: searchParams.get("q"),
    status: searchParams.get("status"),
  });
  return Response.json(await getMixingHistory(session.user.id, filters));
}

async function handlePOST(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const body = createMixingRequestSchema.safeParse(await readBoundedJson(request).catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: { code: "INVALID_REQUEST", message: "추천 곡과 요청 키가 필요해요." } },
      { status: 400 },
    );
  }
  try {
    const job = await enqueueMixingJob({
      userId: session.user.id,
      vocalProfileId: body.data.vocalProfileId,
      songAnalysisId: body.data.songAnalysisId,
      idempotencyKey: body.data.idempotencyKey,
    });
    return Response.json(serializeMixingJob(job), { status: 202 });
  } catch (error) {
    if (error instanceof AdmissionError) return admissionResponse(error);
    if (error instanceof InsufficientTicketsError) {
      return Response.json(
        {
          error: {
            code: "INSUFFICIENT_TICKETS",
            message: error.message,
            kind: error.kind,
            required: error.required,
            balance: error.balance,
          },
        },
        { status: 402 },
      );
    }
    if (error instanceof MixingError) {
      return Response.json(
        { error: { code: error.code, message: error.message, retryable: error.retryable } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "MIXING_ENQUEUE_FAILED", message: "믹싱 요청을 저장하지 못했어요." } },
      { status: 500 },
    );
  }
}

export const GET = withApiAdmission(handleGET);

export const POST = withApiAdmission(handlePOST);
