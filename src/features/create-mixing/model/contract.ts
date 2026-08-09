import { z } from "zod";

export const createMixingRequestSchema = z.object({
  recommendationItemId: z.uuid(),
  idempotencyKey: z.string().trim().min(1).max(200),
});

export type CreateMixingRequest = z.infer<typeof createMixingRequestSchema>;
