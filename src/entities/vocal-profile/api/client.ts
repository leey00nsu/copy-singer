import { mutationOptions } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import {
  type VocalProfileDeleteResponse,
  type VocalProfileRenameResponse,
  vocalProfileDeleteResponseSchema,
  vocalProfileRenameResponseSchema,
} from "../model/contract";

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

export function renameVocalProfile(input: { id: string; displayName: string }): Promise<VocalProfileRenameResponse> {
  return requestJson(`/api/vocal-profiles/${encodeURIComponent(input.id)}`, {
    method: "PATCH",
    json: { displayName: input.displayName },
    schema: vocalProfileRenameResponseSchema,
  });
}

export function renameVocalProfileMutationOptions() {
  return mutationOptions({
    mutationKey: ["vocal-profile", "rename"] as const,
    mutationFn: renameVocalProfile,
  });
}
