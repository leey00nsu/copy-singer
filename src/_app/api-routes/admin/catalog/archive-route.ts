import { withApiAdmission } from "@/_app/api-routes/admission";
import { requireAdminApi } from "@/features/authentication/index.server";
import { archiveAdminSong } from "@/features/manage-song-catalog/index.server";
import { adminCatalogError, adminCatalogJson } from "./http";

async function handlePOST(request: Request, context: { params: Promise<{ songId: string }> }) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  try {
    return adminCatalogJson(await archiveAdminSong((await context.params).songId));
  } catch (error) {
    return adminCatalogError(error);
  }
}

export const POST = withApiAdmission(handlePOST);
