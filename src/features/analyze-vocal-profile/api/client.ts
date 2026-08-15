import { mutationOptions, queryOptions } from "@tanstack/react-query";
import {
  type VocalProfileAnalysisJobList,
  type VocalProfileAnalysisJobResponse,
  type VocalProfileHealth,
  vocalProfileAnalysisJobListSchema,
  vocalProfileAnalysisJobResponseSchema,
  vocalProfileHealthSchema,
} from "@/entities/vocal-profile";
import { ApiError, requestJson } from "@/shared/api";

const ANALYSIS_DETAIL_POLL_INTERVAL_MS = 1_500;
const ANALYSIS_LIST_POLL_INTERVAL_MS = 3_000;

export const vocalAnalysisKeys = {
  all: ["vocal-analysis"] as const,
  health: () => [...vocalAnalysisKeys.all, "health"] as const,
  jobs: () => [...vocalAnalysisKeys.all, "jobs"] as const,
  job: (id: string | null) => [...vocalAnalysisKeys.jobs(), id] as const,
};

export function isActiveAnalysisJob(job: VocalProfileAnalysisJobResponse | null | undefined) {
  return job?.status === "pending" || job?.status === "processing";
}

export function analysisJobPollingInterval(job: VocalProfileAnalysisJobResponse | null | undefined, error: unknown) {
  if (isActiveAnalysisJob(job)) return ANALYSIS_DETAIL_POLL_INTERVAL_MS;
  if (error instanceof ApiError && error.retryable) return ANALYSIS_DETAIL_POLL_INTERVAL_MS;
  return false;
}

export function analysisJobsPollingInterval(payload: VocalProfileAnalysisJobList | undefined) {
  return payload?.jobs.some(isActiveAnalysisJob) ? ANALYSIS_LIST_POLL_INTERVAL_MS : false;
}

export function getVocalProfileHealth(signal?: AbortSignal): Promise<VocalProfileHealth> {
  return requestJson("/api/vocal-profiles/health", {
    cache: "no-store",
    signal,
    schema: vocalProfileHealthSchema,
  });
}

export function getVocalProfileAnalysisJobs(signal?: AbortSignal): Promise<VocalProfileAnalysisJobList> {
  return requestJson("/api/vocal-profile-analysis-jobs", {
    cache: "no-store",
    signal,
    schema: vocalProfileAnalysisJobListSchema,
  });
}

export function getVocalProfileAnalysisJob(id: string, signal?: AbortSignal): Promise<VocalProfileAnalysisJobResponse> {
  return requestJson(`/api/vocal-profile-analysis-jobs/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal,
    schema: vocalProfileAnalysisJobResponseSchema,
  });
}

export function submitVocalProfileAnalysis(input: {
  file: File;
  idempotencyKey: string;
}): Promise<VocalProfileAnalysisJobResponse> {
  const body = new FormData();
  body.append("audio", input.file, input.file.name);
  return requestJson("/api/vocal-profile-analysis-jobs", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey },
    body,
    schema: vocalProfileAnalysisJobResponseSchema,
  });
}

export function vocalProfileHealthQueryOptions() {
  return queryOptions({
    queryKey: vocalAnalysisKeys.health(),
    queryFn: ({ signal }) => getVocalProfileHealth(signal),
  });
}

export function vocalProfileAnalysisJobsQueryOptions() {
  return queryOptions({
    queryKey: vocalAnalysisKeys.jobs(),
    queryFn: ({ signal }) => getVocalProfileAnalysisJobs(signal),
    refetchInterval: (query) => analysisJobsPollingInterval(query.state.data),
  });
}

export function vocalProfileAnalysisJobQueryOptions(id: string | null) {
  return queryOptions({
    queryKey: vocalAnalysisKeys.job(id),
    enabled: id !== null,
    queryFn: ({ signal }) => {
      if (id === null) {
        throw new ApiError("A vocal analysis job ID is required.", {
          kind: "contract",
          code: "MISSING_ANALYSIS_JOB_ID",
        });
      }
      return getVocalProfileAnalysisJob(id, signal);
    },
    refetchInterval: (query) => analysisJobPollingInterval(query.state.data, query.state.error),
  });
}

export function submitVocalProfileAnalysisMutationOptions() {
  return mutationOptions({
    mutationKey: [...vocalAnalysisKeys.all, "submit"] as const,
    mutationFn: submitVocalProfileAnalysis,
  });
}
