export const runtime = "nodejs";

import { getAdminOverview } from "@/_pages/admin/api/index.server";
import { requireAdminApi } from "@/features/authentication/index.server";

export async function GET(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  return Response.json(await getAdminOverview());
}
