import { requireAdminApi } from "@/features/authentication/index.server";
import { getAdminOverview } from "@/features/inspect-admin-operations/index.server";

export async function GET(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  return Response.json(await getAdminOverview());
}
