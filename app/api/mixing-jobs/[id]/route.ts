export const runtime = "nodejs";

import { requireApiSession, unauthorizedResponse } from "@/lib/auth/session";
import { getMixingJobForUser } from "@/lib/mixing/history";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const job = await getMixingJobForUser(session.user.id, (await context.params).id);
  return job
    ? Response.json(job)
    : Response.json({ error: { code: "MIXING_NOT_FOUND", message: "믹싱 작업을 찾을 수 없습니다." } }, { status: 404 });
}
