import { requireAdminApi } from "@/features/authentication/index.server";
import { retryAdminSongAnalysis } from "@/features/manage-song-catalog/index.server";
import { adminCatalogError, adminCatalogJson } from "./http";

export async function POST(request: Request, context: { params: Promise<{ sourceId: string }> }) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  try {
    return adminCatalogJson(await retryAdminSongAnalysis((await context.params).sourceId));
  } catch (error) {
    return adminCatalogError(error);
  }
}
