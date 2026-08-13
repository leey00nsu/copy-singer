import { requireAdminApi } from "@/features/authentication/index.server";
import { publishAdminSongSource } from "@/features/manage-song-catalog/index.server";
import { adminCatalogError, adminCatalogJson } from "./http";

export async function POST(request: Request, context: { params: Promise<{ songId: string; sourceId: string }> }) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  try {
    const { songId, sourceId } = await context.params;
    return adminCatalogJson(await publishAdminSongSource(songId, sourceId));
  } catch (error) {
    return adminCatalogError(error);
  }
}
