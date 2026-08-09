import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError, requestJson } from "@/shared/api";
import {
  type ConversionHealth,
  type ConversionJob,
  conversionDeleteResponseSchema,
  conversionHealthSchema,
  conversionJobSchema,
} from "../model/contract";

const CONVERSION_POLL_INTERVAL_MS = 2_500;
const conversionDeleteResultSchema = z.union([conversionDeleteResponseSchema, z.undefined()]);

export const conversionKeys = {
  all: ["development-conversion"] as const,
  health: () => [...conversionKeys.all, "health"] as const,
  details: () => [...conversionKeys.all, "detail"] as const,
  detail: (id: string | null) => [...conversionKeys.details(), id] as const,
};

export function isActiveConversion(job: ConversionJob | null | undefined) {
  return job?.status === "queued" || job?.status === "processing";
}

export function conversionPollingInterval(job: ConversionJob | undefined) {
  return isActiveConversion(job) ? CONVERSION_POLL_INTERVAL_MS : false;
}

export function getConversionHealth(signal?: AbortSignal): Promise<ConversionHealth> {
  return requestJson("/api/health", {
    cache: "no-store",
    signal,
    schema: conversionHealthSchema,
  });
}

export function getConversion(id: string, signal?: AbortSignal): Promise<ConversionJob> {
  return requestJson(`/api/conversions/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal,
    schema: conversionJobSchema,
  });
}

export function submitConversion(formData: FormData): Promise<ConversionJob> {
  return requestJson("/api/conversions", {
    method: "POST",
    body: formData,
    schema: conversionJobSchema,
  });
}

export function deleteConversion(id: string) {
  return requestJson(`/api/conversions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    schema: conversionDeleteResultSchema,
  });
}

export function conversionHealthQueryOptions() {
  return queryOptions({
    queryKey: conversionKeys.health(),
    queryFn: ({ signal }) => getConversionHealth(signal),
  });
}

export function conversionDetailQueryOptions(id: string | null) {
  return queryOptions({
    queryKey: conversionKeys.detail(id),
    enabled: id !== null,
    queryFn: ({ signal }) => {
      if (id === null) {
        throw new ApiError("A conversion ID is required.", {
          kind: "contract",
          code: "MISSING_CONVERSION_ID",
        });
      }
      return getConversion(id, signal);
    },
    refetchInterval: (query) => conversionPollingInterval(query.state.data),
  });
}

export function submitConversionMutationOptions() {
  return mutationOptions({
    mutationKey: [...conversionKeys.all, "submit"] as const,
    mutationFn: submitConversion,
  });
}

export function deleteConversionMutationOptions() {
  return mutationOptions({
    mutationKey: [...conversionKeys.all, "delete"] as const,
    mutationFn: deleteConversion,
  });
}
