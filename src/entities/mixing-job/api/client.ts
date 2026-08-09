import { queryOptions } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import { type MixingHistoryPayload, mixingHistoryPayloadSchema } from "../model/contract";

const MIXING_HISTORY_POLL_INTERVAL_MS = 5_000;

export const mixingJobKeys = {
  all: ["mixing-job"] as const,
  histories: () => [...mixingJobKeys.all, "history"] as const,
  history: (page: number) => [...mixingJobKeys.histories(), page] as const,
};

export function hasActiveMixingJob(history: MixingHistoryPayload | undefined) {
  return history?.jobs.some((job) => ["pending", "preparing", "submitted", "processing"].includes(job.status)) ?? false;
}

export function mixingHistoryPollingInterval(history: MixingHistoryPayload | undefined) {
  return hasActiveMixingJob(history) ? MIXING_HISTORY_POLL_INTERVAL_MS : false;
}

export function getMixingHistoryPage(page: number, signal?: AbortSignal): Promise<MixingHistoryPayload> {
  const search = new URLSearchParams({ page: String(page) });
  return requestJson(`/api/mixing-jobs?${search}`, {
    cache: "no-store",
    signal,
    schema: mixingHistoryPayloadSchema,
  });
}

export function mixingHistoryQueryOptions(initialData: MixingHistoryPayload) {
  return queryOptions({
    queryKey: mixingJobKeys.history(initialData.page),
    queryFn: ({ signal }) => getMixingHistoryPage(initialData.page, signal),
    initialData,
    refetchInterval: (query) => mixingHistoryPollingInterval(query.state.data),
  });
}
