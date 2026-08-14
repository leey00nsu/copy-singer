import { requireAdminApi } from "@/features/authentication/index.server";
import {
  adminCatalogQuerySchema,
  createAdminSong,
  createAdminSongSchema,
  listAdminCatalog,
  SongCatalogAdminError,
  uploadAdminCatalogTarget,
} from "@/features/manage-song-catalog/index.server";
import { adminCatalogAudioFormData, adminCatalogError, adminCatalogJson } from "./http";

export async function GET(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  try {
    const url = new URL(request.url);
    const query = adminCatalogQuerySchema.parse(Object.fromEntries(url.searchParams));
    return adminCatalogJson(await listAdminCatalog(query));
  } catch (error) {
    return adminCatalogError(error);
  }
}

export async function POST(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  try {
    const form = await adminCatalogAudioFormData(request);
    const audio = form.get("audio");
    if (!(audio instanceof File)) throw new SongCatalogAdminError("AUDIO_REQUIRED", "음원 파일이 필요해요.", 400);
    const input = createAdminSongSchema.parse({
      title: form.get("title"),
      artist: form.get("artist"),
      sourceUrl: form.get("sourceUrl"),
      idempotencyKey: form.get("idempotencyKey"),
    });
    const song = await createAdminSong(input, access.session.user.id);
    const source = song.sources.find((candidate) => candidate.sourceVideoId === input.sourceVideoId);
    if (!source) throw new SongCatalogAdminError("SOURCE_NOT_FOUND", "생성한 음원 출처를 찾을 수 없어요.", 500);
    await uploadAdminCatalogTarget({ sourceId: source.id, file: audio });
    return adminCatalogJson(song, 201);
  } catch (error) {
    return adminCatalogError(error);
  }
}
