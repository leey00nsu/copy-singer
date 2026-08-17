import { z } from "zod";
import { ticketWalletSchema } from "@/entities/ticket";

export const onboardingSnapshotSchema = z.discriminatedUnion("required", [
  z.object({ required: z.literal(false) }),
  z.object({
    required: z.literal(true),
    wallets: z.array(ticketWalletSchema),
  }),
]);

export type OnboardingSnapshot = z.infer<typeof onboardingSnapshotSchema>;

export const onboardingCompletionSchema = z.object({
  completedAt: z.string().datetime(),
});

export type OnboardingCompletion = z.infer<typeof onboardingCompletionSchema>;
