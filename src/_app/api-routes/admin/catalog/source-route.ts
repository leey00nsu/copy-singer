import { requireAdminApi } from "@/features/authentication/index.server";
import {
  replaceAdminSongSource,
  replaceAdminSongSourceSchema,
  SongCatalogAdminError,
  uploadAdminCatalogTarget,
} from "@/features/manage-song-catalog/index.server";
import { adminCatalogAudioFormData, adminCatalogError, adminCatalogJson } from "./http";

export async function POST(request: Request, context: { params: Promise<{ songId: string }> }) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  try {
    const { songId } = await context.params;
    const form = await adminCatalogAudioFormData(request);
    const audio = form.get("audio");
    if (!(audio instanceof File)) throw new SongCatalogAdminError("AUDIO_REQUIRED", "음원 파일이 필요합니다.", 400);
    const input = replaceAdminSongSourceSchema.parse({
      sourceUrl: form.get("sourceUrl"),
      idempotencyKey: form.get("idempotencyKey"),
    });
    const source = await replaceAdminSongSource(songId, input, access.session.user.id);
    await uploadAdminCatalogTarget({ sourceId: source.id, file: audio });
    return adminCatalogJson(source, 201);
  } catch (error) {
    return adminCatalogError(error);
  }
}
