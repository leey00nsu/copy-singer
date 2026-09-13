import { withApiAdmission } from "@/_app/api-routes/admission";
import { requireAdminApi } from "@/features/authentication/index.server";
import { publishAdminSongSource } from "@/features/manage-song-catalog/index.server";
import { adminCatalogError, adminCatalogJson } from "./http";

async function handlePOST(request: Request, context: { params: Promise<{ songId: string; sourceId: string }> }) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  try {
    const { songId, sourceId } = await context.params;
    return adminCatalogJson(await publishAdminSongSource(songId, sourceId));
  } catch (error) {
    return adminCatalogError(error);
  }
}

export const POST = withApiAdmission(handlePOST);
