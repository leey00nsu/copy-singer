import { importDatabaseSongCatalog, parseCatalogSnapshot } from "@/entities/song-catalog/index.server";
import { requireAdminApi } from "@/features/authentication/index.server";
import { prisma } from "@/shared/db/index.server";
import { adminCatalogError, adminCatalogJson } from "./http";

export async function POST(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return adminCatalogJson({ error: { code: "SNAPSHOT_REQUIRED", message: "스냅샷 파일이 필요합니다." } }, 400);
    }
    if (file.size > 20 * 1024 * 1024) {
      return adminCatalogJson(
        { error: { code: "SNAPSHOT_TOO_LARGE", message: "스냅샷 파일은 20MB 이하여야 합니다." } },
        400,
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      return adminCatalogJson({ error: { code: "INVALID_JSON", message: "올바른 JSON 스냅샷이 아닙니다." } }, 400);
    }
    const parsed = parseCatalogSnapshot(payload);
    if (!parsed.success) {
      return adminCatalogJson(
        {
          error: {
            code: "INVALID_SNAPSHOT",
            message: "지원하지 않는 카탈로그 스냅샷 형식입니다.",
            issues: parsed.error.issues,
          },
        },
        400,
      );
    }
    const result = await importDatabaseSongCatalog(prisma, parsed.data);
    return adminCatalogJson(result, 200);
  } catch (error) {
    return adminCatalogError(error);
  }
}
