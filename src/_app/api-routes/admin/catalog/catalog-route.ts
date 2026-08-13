import { requireAdminApi } from "@/features/authentication/index.server";
import {
  adminCatalogQuerySchema,
  createAdminSong,
  createAdminSongSchema,
  listAdminCatalog,
} from "@/features/manage-song-catalog/index.server";
import { adminCatalogError, adminCatalogJson } from "./http";

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
    const input = createAdminSongSchema.parse(await request.json());
    return adminCatalogJson(await createAdminSong(input, access.session.user.id), 201);
  } catch (error) {
    return adminCatalogError(error);
  }
}
