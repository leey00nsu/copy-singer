import { z } from "zod";
import { ticketWalletSchema } from "@/entities/ticket";

const onboardingWalletsSchema = z
  .array(ticketWalletSchema)
  .length(2)
  .superRefine((wallets, context) => {
    for (const kind of ["VOCAL_ANALYSIS", "AI_MIXING"] as const) {
      if (wallets.filter((wallet) => wallet.kind === kind).length !== 1) {
        context.addIssue({ code: "custom", message: `Onboarding requires exactly one ${kind} wallet.` });
      }
    }
  });

export const onboardingSnapshotSchema = z.discriminatedUnion("required", [
  z.object({ required: z.literal(false) }),
  z.object({
    required: z.literal(true),
    wallets: onboardingWalletsSchema,
  }),
]);

export type OnboardingSnapshot = z.infer<typeof onboardingSnapshotSchema>;

export const onboardingCompletionSchema = z.object({
  completedAt: z.string().datetime(),
});

export type OnboardingCompletion = z.infer<typeof onboardingCompletionSchema>;
