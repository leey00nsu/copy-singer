import { z } from "zod";

const youtubeVideoId = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{11}$/, "올바른 YouTube video ID가 아닙니다.");
const sourceUrl = z.url().refine((value) => {
  const host = new URL(value).hostname.replace(/^www\./, "");
  return host === "youtube.com" || host === "youtu.be";
}, "YouTube URL만 사용할 수 있습니다.");

function videoIdFromUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.replace(/^www\./, "");
  return host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v");
}

function matchingSource<T extends { sourceUrl: string; sourceVideoId: string }>(schema: z.ZodObject<z.ZodRawShape>) {
  return schema.superRefine((value, context) => {
    if (videoIdFromUrl(value.sourceUrl as string) !== value.sourceVideoId) {
      context.addIssue({ code: "custom", path: ["sourceVideoId"], message: "URL과 video ID가 일치하지 않습니다." });
    }
  }) as unknown as z.ZodType<T>;
}

export const createAdminSongSchema = matchingSource<{
  title: string;
  artist: string;
  originalKey?: string | null;
  catalogPosition?: number;
  sourceUrl: string;
  sourceVideoId: string;
  sourceLabel: string;
  idempotencyKey: string;
}>(
  z.object({
    title: z.string().trim().min(1).max(200),
    artist: z.string().trim().min(1).max(200),
    originalKey: z.string().trim().max(20).nullable().optional(),
    catalogPosition: z.number().int().positive().optional(),
    sourceUrl,
    sourceVideoId: youtubeVideoId,
    sourceLabel: z.string().trim().min(1).max(200),
    idempotencyKey: z.string().trim().min(1).max(200),
  }),
);

export const replaceAdminSongSourceSchema = matchingSource<{
  sourceUrl: string;
  sourceVideoId: string;
  sourceLabel: string;
  idempotencyKey: string;
}>(
  z.object({
    sourceUrl,
    sourceVideoId: youtubeVideoId,
    sourceLabel: z.string().trim().min(1).max(200),
    idempotencyKey: z.string().trim().min(1).max(200),
  }),
);

export const adminCatalogQuerySchema = z.object({
  q: z.string().trim().max(200).default(""),
  status: z.enum(["", "DRAFT", "ACTIVE", "ARCHIVED"]).default(""),
  page: z.coerce.number().int().positive().default(1),
});

export type CreateAdminSongInput = z.infer<typeof createAdminSongSchema>;
export type ReplaceAdminSongSourceInput = z.infer<typeof replaceAdminSongSourceSchema>;
