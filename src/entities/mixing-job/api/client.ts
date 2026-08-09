import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import { isActiveMixingStatus } from "../lib/presentation";
import {
  type MixingDeleteResponse,
  type MixingHistoryFilters,
  type MixingHistoryPayload,
  type MixingHistoryRow,
  mixingDeleteResponseSchema,
  mixingHistoryFiltersSchema,
  mixingHistoryPayloadSchema,
  mixingHistoryRowSchema,
} from "../model/contract";

const MIXING_HISTORY_POLL_INTERVAL_MS = 5_000;

export const mixingJobKeys = {
  all: ["mixing-job"] as const,
  histories: () => [...mixingJobKeys.all, "history"] as const,
  history: (filters: number | Partial<MixingHistoryFilters>) =>
    [
      ...mixingJobKeys.histories(),
      mixingHistoryFiltersSchema.parse(typeof filters === "number" ? { page: filters } : filters),
    ] as const,
  details: () => [...mixingJobKeys.all, "detail"] as const,
  detail: (id: string) => [...mixingJobKeys.details(), id] as const,
};

export function hasActiveMixingJob(history: MixingHistoryPayload | undefined) {
  return history?.jobs.some((job) => ["pending", "preparing", "submitted", "processing"].includes(job.status)) ?? false;
}

export function mixingHistoryPollingInterval(history: MixingHistoryPayload | undefined) {
  return hasActiveMixingJob(history) ? MIXING_HISTORY_POLL_INTERVAL_MS : false;
}

export function mixingDetailPollingInterval(job: MixingHistoryRow | undefined) {
  return job && isActiveMixingStatus(job.status) ? MIXING_HISTORY_POLL_INTERVAL_MS : false;
}

export function getMixingHistoryPage(
  pageOrFilters: number | Partial<MixingHistoryFilters>,
  signal?: AbortSignal,
): Promise<MixingHistoryPayload> {
  const filters = mixingHistoryFiltersSchema.parse(
    typeof pageOrFilters === "number" ? { page: pageOrFilters } : pageOrFilters,
  );
  const search = new URLSearchParams({ page: String(filters.page) });
  if (filters.q) search.set("q", filters.q);
  if (filters.status !== "all") search.set("status", filters.status);
  return requestJson(`/api/mixing-jobs?${search}`, {
    cache: "no-store",
    signal,
    schema: mixingHistoryPayloadSchema,
  });
}

export function mixingHistoryQueryOptions(
  initialData: MixingHistoryPayload,
  input: Partial<MixingHistoryFilters> = {},
) {
  const filters = mixingHistoryFiltersSchema.parse({ ...input, page: initialData.page });
  return queryOptions({
    queryKey: mixingJobKeys.history(filters),
    queryFn: ({ signal }) => getMixingHistoryPage(filters, signal),
    initialData,
    refetchInterval: (query) => mixingHistoryPollingInterval(query.state.data),
  });
}

export function getMixingJob(id: string, signal?: AbortSignal): Promise<MixingHistoryRow> {
  return requestJson(`/api/mixing-jobs/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal,
    schema: mixingHistoryRowSchema,
  });
}

export function mixingDetailQueryOptions(id: string, initialData?: MixingHistoryRow) {
  return queryOptions({
    queryKey: mixingJobKeys.detail(id),
    queryFn: ({ signal }) => getMixingJob(id, signal),
    ...(initialData ? { initialData } : {}),
    refetchInterval: (query) => mixingDetailPollingInterval(query.state.data),
  });
}

export function deleteMixingJob(id: string): Promise<MixingDeleteResponse> {
  return requestJson(`/api/mixing-jobs/${encodeURIComponent(id)}`, {
    method: "DELETE",
    schema: mixingDeleteResponseSchema,
  });
}

export function deleteMixingJobMutationOptions() {
  return mutationOptions({
    mutationKey: ["mixing-job", "delete"] as const,
    mutationFn: deleteMixingJob,
  });
}
