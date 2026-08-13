import { exportDatabaseSongCatalog } from "@/entities/song-catalog/index.server";
import { requireAdminApi } from "@/features/authentication/index.server";
import { adminCatalogError } from "./http";

export async function GET(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  try {
    const snapshot = await exportDatabaseSongCatalog();
    const date = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(snapshot, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="catalog-snapshot-${date}.json"`,
      },
    });
  } catch (error) {
    return adminCatalogError(error);
  }
}
