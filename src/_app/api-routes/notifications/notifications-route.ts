import { getNotifications, notificationFiltersSchema } from "@/entities/notification/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const searchParams = new URL(request.url).searchParams;
  const filters = notificationFiltersSchema.parse({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  });
  return Response.json(await getNotifications(session.user.id, filters.page, filters.pageSize));
}
