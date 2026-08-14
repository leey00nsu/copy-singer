import { requireAdminApi } from "@/features/authentication/index.server";
import { SongCatalogAdminError, uploadAdminCatalogTarget } from "@/features/manage-song-catalog/index.server";
import { adminCatalogAudioFormData, adminCatalogError, adminCatalogJson } from "./http";

export async function POST(request: Request, context: { params: Promise<{ sourceId: string }> }) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  try {
    const { sourceId } = await context.params;
    const form = await adminCatalogAudioFormData(request);
    const file = form.get("audio");
    if (!(file instanceof File)) throw new SongCatalogAdminError("AUDIO_REQUIRED", "음원 파일이 필요합니다.", 400);
    return adminCatalogJson(await uploadAdminCatalogTarget({ sourceId, file }), 201);
  } catch (error) {
    return adminCatalogError(error);
  }
}
