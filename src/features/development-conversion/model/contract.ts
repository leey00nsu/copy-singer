import { z } from "zod";

export const conversionHealthSchema = z.object({
  status: z.enum(["ok", "not_configured", "unavailable"]),
  platform: z.string().optional(),
  gpu: z.string().optional(),
});

export type ConversionHealth = z.infer<typeof conversionHealthSchema>;

export const conversionJobStatusSchema = z.enum(["queued", "processing", "succeeded", "failed"]);

export const conversionJobSchema = z.object({
  id: z.string().min(1),
  status: conversionJobStatusSchema,
  created_at: z.number().optional(),
  error: z.string().nullable().optional(),
  result_url: z.string().nullable().optional(),
});

export type ConversionJob = z.infer<typeof conversionJobSchema>;

export const conversionDeleteResponseSchema = z
  .object({
    status: z.string().optional(),
  })
  .passthrough();

export const conversionIdSchema = z.string().trim().min(1).max(200);
