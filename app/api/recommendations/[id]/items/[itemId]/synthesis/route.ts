export const runtime = "nodejs";

import { requireApiSession, unauthorizedResponse } from "@/lib/auth/session";

export async function POST(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  await context.params;
  return Response.json(
    { error: { code: "SYNTHESIS_ENDPOINT_RETIRED", message: "티켓이 적용되는 /api/mixing-jobs를 사용해주세요.", retryable: false } },
    { status: 410 },
  );
}
