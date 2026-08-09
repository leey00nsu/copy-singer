export const runtime = "nodejs";

import { requireAdminApi } from "@/features/authentication/index.server";
import { getAdminOverview } from "@/lib/admin/service";

export async function GET(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  return Response.json(await getAdminOverview());
}
