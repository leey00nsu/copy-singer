export const runtime = "nodejs";

import { getAdminOverview } from "@/lib/admin/service";
import { requireAdminApi } from "@/lib/auth/admin";

export async function GET(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  return Response.json(await getAdminOverview());
}
