import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError, requestJson } from "@/shared/api";
import {
  ADMIN_CUSTOM_MIXING_LIMITS,
  type AdminCustomMixingJob,
  type AdminCustomMixingProfilesResponse,
  adminCustomMixingDeleteResponseSchema,
  adminCustomMixingIdSchema,
  adminCustomMixingJobSchema,
  adminCustomMixingProfilesResponseSchema,
} from "../model/contract";

const POLL_INTERVAL_MS = 2_500;
const deleteResultSchema = z.union([adminCustomMixingDeleteResponseSchema, z.undefined()]);

export const adminCustomMixingKeys = {
  all: ["admin-custom-mixing"] as const,
  profiles: () => [...adminCustomMixingKeys.all, "profiles"] as const,
  conversions: () => [...adminCustomMixingKeys.all, "conversions"] as const,
  conversion: (id: string | null) => [...adminCustomMixingKeys.conversions(), id] as const,
};

export function isActiveAdminCustomMixing(job: AdminCustomMixingJob | null | undefined) {
  return job?.status === "queued" || job?.status === "processing";
}

export function adminCustomMixingPollingInterval(job: AdminCustomMixingJob | undefined) {
  return isActiveAdminCustomMixing(job) ? POLL_INTERVAL_MS : false;
}

export function getAdminCustomMixingProfiles(signal?: AbortSignal): Promise<AdminCustomMixingProfilesResponse> {
  return requestJson("/api/admin/custom-mixing/profiles", {
    cache: "no-store",
    signal,
    schema: adminCustomMixingProfilesResponseSchema,
  });
}

export function getAdminCustomMixingConversion(id: string, signal?: AbortSignal): Promise<AdminCustomMixingJob> {
  return requestJson(`/api/admin/custom-mixing/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal,
    schema: adminCustomMixingJobSchema,
  });
}

export function submitAdminCustomMixing(formData: FormData): Promise<AdminCustomMixingJob> {
  return requestJson("/api/admin/custom-mixing", {
    method: "POST",
    body: formData,
    schema: adminCustomMixingJobSchema,
  });
}

export function deleteAdminCustomMixingConversion(id: string) {
  return requestJson(`/api/admin/custom-mixing/${encodeURIComponent(id)}`, {
    method: "DELETE",
    schema: deleteResultSchema,
  });
}

export function adminCustomMixingProfilesQueryOptions() {
  return queryOptions({
    queryKey: adminCustomMixingKeys.profiles(),
    queryFn: ({ signal }) => getAdminCustomMixingProfiles(signal),
  });
}

export function adminCustomMixingConversionQueryOptions(id: string | null) {
  return queryOptions({
    queryKey: adminCustomMixingKeys.conversion(id),
    enabled: id !== null,
    queryFn: ({ signal }) => {
      if (id === null) {
        throw new ApiError("A conversion ID is required.", {
          kind: "contract",
          code: "MISSING_ADMIN_CONVERSION_ID",
        });
      }
      const parsed = adminCustomMixingIdSchema.safeParse(id);
      if (!parsed.success) {
        throw new ApiError("Invalid conversion ID.", { kind: "contract", code: "INVALID_ADMIN_CONVERSION_ID" });
      }
      return getAdminCustomMixingConversion(parsed.data, signal);
    },
    refetchInterval: (query) => adminCustomMixingPollingInterval(query.state.data),
  });
}

export function submitAdminCustomMixingMutationOptions() {
  return mutationOptions({
    mutationKey: [...adminCustomMixingKeys.all, "submit"] as const,
    mutationFn: submitAdminCustomMixing,
  });
}

export function deleteAdminCustomMixingMutationOptions() {
  return mutationOptions({
    mutationKey: [...adminCustomMixingKeys.all, "delete"] as const,
    mutationFn: deleteAdminCustomMixingConversion,
  });
}

export { ADMIN_CUSTOM_MIXING_LIMITS };
