import { markAllNotificationsRead } from "@/entities/notification/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";

export async function POST(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  return Response.json(await markAllNotificationsRead(session.user.id));
}
