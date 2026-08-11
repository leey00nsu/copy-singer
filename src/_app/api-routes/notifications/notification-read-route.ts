import { markNotificationRead } from "@/entities/notification/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { resourceIdSchema } from "@/shared/api";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const id = resourceIdSchema.safeParse((await context.params).id);
  const notification = id.success ? await markNotificationRead(session.user.id, id.data) : null;
  return notification
    ? Response.json({ notification })
    : Response.json(
        { error: { code: "NOTIFICATION_NOT_FOUND", message: "알림을 찾을 수 없습니다.", retryable: false } },
        { status: 404 },
      );
}
