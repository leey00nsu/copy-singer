import { queryOptions } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import {
  type MixingHistoryFilters,
  type MixingHistoryPayload,
  mixingHistoryFiltersSchema,
  mixingHistoryPayloadSchema,
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
};

export function hasActiveMixingJob(history: MixingHistoryPayload | undefined) {
  return history?.jobs.some((job) => ["pending", "preparing", "submitted", "processing"].includes(job.status)) ?? false;
}

export function mixingHistoryPollingInterval(history: MixingHistoryPayload | undefined) {
  return hasActiveMixingJob(history) ? MIXING_HISTORY_POLL_INTERVAL_MS : false;
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
