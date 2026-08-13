import {
  type VocalProfileAnalysisJobResponse,
  type VocalProfileError,
  vocalProfileErrorSchema,
} from "@/entities/vocal-profile";
import { ApiError } from "@/shared/api";

export const MIN_VOICE_SCAN_DURATION_MS = 5_000;
export const RECOMMENDED_VOICE_SCAN_DURATION_MS = 10_000;

export type RecordingMilestone = "minimum" | "analyzable" | "recommended";
export type RecorderIssueKind = "permission_denied" | "device_unavailable" | "unsupported" | "unknown";
export type AnalysisStatusStage = "submitting" | "pending" | "retrying" | "processing" | "reconnecting" | "failed";

export type RecorderIssue = {
  description: string;
  kind: RecorderIssueKind;
  title: string;
};

export const ANALYSIS_ERROR_GUIDANCE: Record<string, { action: string; title: string }> = {
  TOO_SHORT: { title: "녹음이 너무 짧아요", action: "5초 이상 노래한 뒤 다시 시도해주세요." },
  TOO_LONG: { title: "녹음이 너무 길어요", action: "파일을 다시 선택한 뒤 자동 자르기에 동의해주세요." },
  TOO_SILENT: { title: "목소리가 너무 작아요", action: "마이크에 조금 가까이 다가가 반주 없이 더 크게 불러주세요." },
  EXCESSIVE_CLIPPING: { title: "소리가 찌그러졌어요", action: "마이크에서 조금 멀어지거나 입력 음량을 낮춰주세요." },
  LOW_VOICED_RATIO: {
    title: "노래 음정을 충분히 찾지 못했어요",
    action: "말소리보다 모음 ‘아’로 길게, 반주 없이 다시 불러주세요.",
  },
  PAYLOAD_TOO_LARGE: { title: "파일이 너무 커요", action: "25MB 이하 파일을 사용해주세요." },
  UNSUPPORTED_AUDIO: { title: "지원하지 않는 오디오예요", action: "WAV, MP3, M4A 또는 WebM 파일을 사용해주세요." },
  INVALID_SEGMENTS: { title: "안내 녹음 구간이 올바르지 않아요", action: "새 안내 녹음을 만든 뒤 다시 분석해주세요." },
  ANALYZER_UNAVAILABLE: { title: "보컬 분석기에 연결할 수 없어요", action: "잠시 뒤 다시 시도해주세요." },
  ANALYZER_NOT_CONFIGURED: { title: "분석기 설정이 필요해요", action: "서버의 보컬 분석기 환경 변수를 확인해주세요." },
  ANALYSIS_ENQUEUE_FAILED: { title: "분석 대기열에 추가하지 못했어요", action: "잠시 뒤 다시 시도해주세요." },
  ANALYSIS_SOURCE_UNAVAILABLE: { title: "분석용 음성을 불러오지 못했어요", action: "잠시 뒤 다시 시도해주세요." },
  PROFILE_SAVE_FAILED: {
    title: "분석 결과를 저장하지 못했어요",
    action: "데이터베이스 연결을 확인한 뒤 다시 시도해주세요.",
  },
};

export function recordingMilestone(elapsedMs: number): RecordingMilestone {
  if (!Number.isFinite(elapsedMs) || elapsedMs < MIN_VOICE_SCAN_DURATION_MS) return "minimum";
  if (elapsedMs < RECOMMENDED_VOICE_SCAN_DURATION_MS) return "analyzable";
  return "recommended";
}

export function canAnalyzeVoiceScan(durationSeconds: number | null) {
  return durationSeconds === null || durationSeconds * 1_000 >= MIN_VOICE_SCAN_DURATION_MS;
}

export function recorderIssueFromError(error: unknown): RecorderIssue {
  const name = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  const message = error instanceof Error ? error.message : String(error);

  if (name === "NotAllowedError" || name === "SecurityError") {
    return {
      kind: "permission_denied",
      title: "마이크 권한이 차단됐어요",
      description: "브라우저 주소창의 사이트 설정에서 마이크를 허용하거나 아래에서 오디오 파일을 업로드해주세요.",
    };
  }
  if (["NotFoundError", "DevicesNotFoundError", "NotReadableError", "TrackStartError", "AbortError"].includes(name)) {
    return {
      kind: "device_unavailable",
      title: "사용할 수 있는 마이크를 찾지 못했어요",
      description: "다른 앱이 마이크를 사용 중인지 확인하고 장치를 다시 연결하거나 오디오 파일을 업로드해주세요.",
    };
  }
  if (message.includes("MEDIA_RECORDER_UNAVAILABLE")) {
    return {
      kind: "unsupported",
      title: "이 브라우저에서는 마이크 녹음을 지원하지 않아요",
      description: "최신 브라우저로 다시 열거나 WAV, MP3, M4A, WebM 파일을 업로드해주세요.",
    };
  }
  return {
    kind: "unknown",
    title: "마이크를 시작하지 못했어요",
    description: "마이크 연결과 브라우저 권한을 확인한 뒤 다시 시도하거나 오디오 파일을 업로드해주세요.",
  };
}

export function normalizeProfileError(value: unknown): VocalProfileError {
  const parsed = vocalProfileErrorSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  if (value instanceof ApiError) {
    return {
      reasonCode: value.code ?? "ANALYSIS_FAILED",
      detail: value.message,
      retryable: value.retryable,
    };
  }
  return { reasonCode: "ANALYSIS_FAILED", detail: "Unknown analysis error.", retryable: true };
}

export function resolveAnalysisStage(input: {
  error: VocalProfileError | null;
  job: VocalProfileAnalysisJobResponse | null | undefined;
  requestError: VocalProfileError | null;
  submitting: boolean;
}): AnalysisStatusStage | null {
  if (input.error) return "failed";
  if (input.submitting) return "submitting";
  if (input.requestError?.retryable) return "reconnecting";
  if (input.job?.status === "failed") return "failed";
  if (input.job?.status === "processing") return "processing";
  if (input.job?.status === "pending" && input.job.attempts > 0 && input.job.error?.retryable) return "retrying";
  if (input.job?.status === "pending") return "pending";
  return null;
}
