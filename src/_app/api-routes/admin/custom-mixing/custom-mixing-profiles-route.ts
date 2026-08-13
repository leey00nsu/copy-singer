import { listAdminCustomMixingProfiles } from "@/features/admin-custom-mixing/index.server";
import { requireAdminApi } from "@/features/authentication/index.server";

export async function GET(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  const profiles = await listAdminCustomMixingProfiles(access.session.user.id);
  return Response.json({ profiles });
}
