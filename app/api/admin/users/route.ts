export const runtime = "nodejs";

import { requireAdminApi } from "@/features/authentication/index.server";
import { listAdminUsers } from "@/lib/admin/service";

export async function GET(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  const url = new URL(request.url);
  const result = await listAdminUsers(url.searchParams.get("q") ?? "", Number(url.searchParams.get("page") ?? "1"));
  return Response.json({
    ...result,
    users: result.users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() })),
  });
}
