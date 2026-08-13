import { requireAdminApi } from "@/features/authentication/index.server";
import { archiveAdminSong } from "@/features/manage-song-catalog/index.server";
import { adminCatalogError, adminCatalogJson } from "./http";

export async function POST(request: Request, context: { params: Promise<{ songId: string }> }) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  try {
    return adminCatalogJson(await archiveAdminSong((await context.params).songId));
  } catch (error) {
    return adminCatalogError(error);
  }
}
