import { z } from "zod";

export const createRecommendationRequestSchema = z.object({
  userVocalProfileId: z.uuid(),
});

export type CreateRecommendationRequest = z.infer<typeof createRecommendationRequestSchema>;
