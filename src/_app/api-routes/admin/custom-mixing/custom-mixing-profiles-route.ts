import { withApiAdmission } from "@/_app/api-routes/admission";
import { listAdminCustomMixingProfiles } from "@/features/admin-custom-mixing/index.server";
import { requireAdminApi } from "@/features/authentication/index.server";

async function handleGET(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  const profiles = await listAdminCustomMixingProfiles(access.session.user.id);
  return Response.json({ profiles });
}

export const GET = withApiAdmission(handleGET);
