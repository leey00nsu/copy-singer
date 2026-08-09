import { mutationOptions } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import { type VocalProfileDeleteResponse, vocalProfileDeleteResponseSchema } from "../model/contract";

export function deleteVocalProfile(id: string): Promise<VocalProfileDeleteResponse> {
  return requestJson(`/api/vocal-profiles/${encodeURIComponent(id)}`, {
    method: "DELETE",
    schema: vocalProfileDeleteResponseSchema,
  });
}

export function deleteVocalProfileMutationOptions() {
  return mutationOptions({
    mutationKey: ["vocal-profile", "delete"] as const,
    mutationFn: deleteVocalProfile,
  });
}
