export const runtime = "nodejs";

import { getMixingJobForUser } from "@/entities/mixing-job/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const job = await getMixingJobForUser(session.user.id, (await context.params).id);
  return job
    ? Response.json(job)
    : Response.json({ error: { code: "MIXING_NOT_FOUND", message: "믹싱 작업을 찾을 수 없습니다." } }, { status: 404 });
}
