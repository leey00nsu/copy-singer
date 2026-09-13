import { withApiAdmission } from "@/_app/api-routes/admission";
import { requireAdminApi } from "@/features/authentication/index.server";
import { getAdminOverview } from "@/features/inspect-admin-operations/index.server";

async function handleGET(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  return Response.json(await getAdminOverview());
}

export const GET = withApiAdmission(handleGET);
