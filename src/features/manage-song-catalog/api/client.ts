import { z } from "zod";
import { requestJson } from "@/shared/api";

const entityResponseSchema = z.object({ id: z.string() }).passthrough();

const catalogImportResultSchema = z.object({
  total: z.number().int().nonnegative(),
  published: z.number().int().nonnegative(),
  songsCreated: z.number().int().nonnegative(),
  sourcesCreated: z.number().int().nonnegative(),
  analysesCreated: z.number().int().nonnegative(),
  targetsCreated: z.number().int().nonnegative(),
  entriesCreated: z.number().int().nonnegative(),
});

export type CatalogImportResult = z.infer<typeof catalogImportResultSchema>;

export function addAdminSong(
  input: {
    title: string;
    artist: string;
    sourceUrl: string;
    idempotencyKey: string;
  },
  file: File,
) {
  const body = new FormData();
  body.set("title", input.title);
  body.set("artist", input.artist);
  body.set("sourceUrl", input.sourceUrl);
  body.set("idempotencyKey", input.idempotencyKey);
  body.set("audio", file);
  return requestJson("/api/admin/catalog", { method: "POST", body, schema: entityResponseSchema });
}

export function replaceAdminSource(
  songId: string,
  input: {
    sourceUrl: string;
    idempotencyKey: string;
  },
  file: File,
) {
  const body = new FormData();
  body.set("sourceUrl", input.sourceUrl);
  body.set("idempotencyKey", input.idempotencyKey);
  body.set("audio", file);
  return requestJson(`/api/admin/catalog/${songId}/sources`, {
    method: "POST",
    body,
    schema: entityResponseSchema,
  });
}

export function uploadAdminTarget(sourceId: string, file: File) {
  const body = new FormData();
  body.set("audio", file);
  return requestJson(`/api/admin/catalog/sources/${sourceId}/target`, {
    method: "POST",
    body,
    schema: entityResponseSchema,
  });
}

export function retryAdminAnalysis(sourceId: string) {
  return requestJson(`/api/admin/catalog/sources/${sourceId}/retry`, { method: "POST", schema: entityResponseSchema });
}

export function publishAdminSource(songId: string, sourceId: string) {
  return requestJson(`/api/admin/catalog/${songId}/sources/${sourceId}/publish`, {
    method: "POST",
    schema: entityResponseSchema,
  });
}

export function importAdminCatalogSnapshot(file: File): Promise<CatalogImportResult> {
  const body = new FormData();
  body.set("file", file);
  return requestJson("/api/admin/catalog/import", {
    method: "POST",
    body,
    schema: catalogImportResultSchema,
  });
}

export function archiveAdminSongClient(songId: string) {
  return requestJson(`/api/admin/catalog/${songId}/archive`, { method: "POST", schema: entityResponseSchema });
}
