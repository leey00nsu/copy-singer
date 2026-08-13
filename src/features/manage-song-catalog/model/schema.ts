import { z } from "zod";

const youtubeVideoId = z.string().regex(/^[A-Za-z0-9_-]{11}$/);

export function youtubeVideoIdFromUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(?:www|m|music)\./, "");
  let candidate: string | null = null;
  if (host === "youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
  if (host === "youtube.com") {
    candidate =
      (url.pathname === "/watch" ? url.searchParams.get("v") : null) ??
      (/^\/(?:shorts|live)\/[^/]+/.test(url.pathname) ? (url.pathname.split("/")[2] ?? null) : null);
  }
  return youtubeVideoId.safeParse(candidate).success ? candidate : null;
}

const sourceUrl = z
  .url()
  .refine((value) => youtubeVideoIdFromUrl(value) !== null, "유효한 HTTPS YouTube URL을 입력해 주세요.");

export const createAdminSongSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    artist: z.string().trim().min(1).max(200),
    catalogPosition: z.number().int().positive().optional(),
    sourceUrl,
    idempotencyKey: z.string().trim().min(1).max(200),
  })
  .transform((value) => ({
    ...value,
    sourceVideoId: youtubeVideoIdFromUrl(value.sourceUrl) as string,
    sourceLabel: "관리자 업로드",
  }));

export const replaceAdminSongSourceSchema = z
  .object({
    sourceUrl,
    idempotencyKey: z.string().trim().min(1).max(200),
  })
  .transform((value) => ({
    ...value,
    sourceVideoId: youtubeVideoIdFromUrl(value.sourceUrl) as string,
    sourceLabel: "관리자 교체 업로드",
  }));

export const adminCatalogQuerySchema = z.object({
  q: z.string().trim().max(200).default(""),
  status: z.enum(["", "DRAFT", "ACTIVE", "ARCHIVED"]).default(""),
  page: z.coerce.number().int().positive().default(1),
});

export type CreateAdminSongInput = z.output<typeof createAdminSongSchema>;
export type ReplaceAdminSongSourceInput = z.output<typeof replaceAdminSongSourceSchema>;
