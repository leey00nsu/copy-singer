import { getMixingJobForUser } from "@/entities/mixing-job/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { resourceIdSchema } from "@/shared/api";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const id = resourceIdSchema.safeParse((await context.params).id);
  const job = id.success ? await getMixingJobForUser(session.user.id, id.data) : null;
  return job
    ? Response.json(job)
    : Response.json({ error: { code: "MIXING_NOT_FOUND", message: "믹싱 작업을 찾을 수 없습니다." } }, { status: 404 });
}
