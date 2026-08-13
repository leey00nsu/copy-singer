import { z } from "zod";

export const ADMIN_CUSTOM_MIXING_LIMITS = Object.freeze({
  referenceBytes: 128 * 1024 * 1024,
  targetBytes: 256 * 1024 * 1024,
  targetDurationSeconds: 300,
});

export const adminCustomMixingStatusSchema = z.enum(["queued", "processing", "succeeded", "failed"]);

export const adminCustomMixingJobSchema = z.object({
  id: z.string().min(1),
  status: adminCustomMixingStatusSchema,
  created_at: z.number().optional(),
  error: z.string().nullable().optional(),
  result_url: z.string().nullable().optional(),
});

export type AdminCustomMixingJob = z.infer<typeof adminCustomMixingJobSchema>;

export const adminCustomMixingProfileSchema = z.object({
  id: z.string().uuid(),
  profileNumber: z.number().int().nullable(),
  displayName: z.string().min(1),
  referenceKind: z.enum(["SYNTHESIS_REFERENCE", "REFERENCE"]).nullable(),
  referenceReady: z.boolean(),
});

export const adminCustomMixingProfilesResponseSchema = z.object({
  profiles: z.array(adminCustomMixingProfileSchema),
});

export type AdminCustomMixingProfile = z.infer<typeof adminCustomMixingProfileSchema>;
export type AdminCustomMixingProfilesResponse = z.infer<typeof adminCustomMixingProfilesResponseSchema>;

export const adminCustomMixingDeleteResponseSchema = z.object({ status: z.string().optional() }).passthrough();

export const adminCustomMixingIdSchema = z.string().trim().min(1).max(200);
