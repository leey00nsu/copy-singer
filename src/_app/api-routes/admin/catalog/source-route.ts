import { requireAdminApi } from "@/features/authentication/index.server";
import { replaceAdminSongSource, replaceAdminSongSourceSchema } from "@/features/manage-song-catalog/index.server";
import { adminCatalogError, adminCatalogJson } from "./http";

export async function POST(request: Request, context: { params: Promise<{ songId: string }> }) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  try {
    const { songId } = await context.params;
    const input = replaceAdminSongSourceSchema.parse(await request.json());
    return adminCatalogJson(await replaceAdminSongSource(songId, input, access.session.user.id), 201);
  } catch (error) {
    return adminCatalogError(error);
  }
}
