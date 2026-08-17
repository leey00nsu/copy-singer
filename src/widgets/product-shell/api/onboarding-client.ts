import { mutationOptions } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import { onboardingCompletionSchema } from "../model/onboarding-contract";

export function completeCurrentUserOnboarding() {
  return requestJson("/api/account/onboarding/completion", {
    method: "POST",
    schema: onboardingCompletionSchema,
  });
}

export function completeOnboardingMutationOptions() {
  return mutationOptions({
    mutationKey: ["onboarding", "complete"] as const,
    mutationFn: completeCurrentUserOnboarding,
  });
}
