"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioLines, Check, Mic2, ShieldCheck, Timer, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { isLongProfileAudio, readAudioDuration } from "@/entities/vocal-profile";
import {
  isActiveAnalysisJob,
  MAX_PROFILE_ANALYSIS_AUDIO_BYTES,
  submitVocalProfileAnalysisMutationOptions,
  vocalAnalysisKeys,
  vocalProfileAnalysisJobQueryOptions,
} from "@/features/analyze-vocal-profile";
import { prepareProfileAudio } from "@/shared/lib/audio";
import { StatusNotice } from "@/shared/ui/status-notice";
import { CreationFunnelShell } from "@/widgets/creation-funnel";
import {
  normalizeProfileError,
  type RecorderIssue,
  recorderIssueFromError,
  resolveAnalysisStage,
} from "../model/voice-scan";
import { AnalysisStatus } from "./analysis-status";
import { LongAudioDialog } from "./long-audio-dialog";
import type { VocalProfileRecorderState } from "./vocal-profile-recorder";
import { VoiceScanInput } from "./voice-scan-input";

const ANALYSIS_JOB_STORAGE_KEY = "copy-singer:vocal-profile-analysis-job";

export function VocalProfileWorkbench() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [pendingLongFile, setPendingLongFile] = useState<File | null>(null);
  const [pendingLongDuration, setPendingLongDuration] = useState<number | null>(null);
  const [preparingAudio, setPreparingAudio] = useState(false);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [inputError, setInputError] = useState<string | null>(null);
  const [recorderIssue, setRecorderIssue] = useState<RecorderIssue | null>(null);
  const [recorderState, setRecorderState] = useState<VocalProfileRecorderState>("idle");
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<ReturnType<typeof normalizeProfileError> | null>(null);
  const analysisIdempotencyKey = useRef<string | null>(null);
  const handledTerminalJob = useRef<string | null>(null);

  const analysisJobQuery = useQuery(vocalProfileAnalysisJobQueryOptions(analysisJobId));
  const submitAnalysis = useMutation(submitVocalProfileAnalysisMutationOptions());
  const analysisJob = analysisJobQuery.data;
  const analysisJobRequestError = analysisJobQuery.error ? normalizeProfileError(analysisJobQuery.error) : null;
  const terminalAnalysisError =
    analysisJob?.status === "failed"
      ? (analysisJob.error ?? {
          reasonCode: "ANALYSIS_FAILED",
          detail: "Background analysis failed.",
          retryable: true,
        })
      : analysisJobRequestError && !analysisJobRequestError.retryable
        ? analysisJobRequestError
        : null;
  const completedProfileId = analysisJob?.vocalProfileId ?? analysisJob?.profile?.id ?? null;
  const successContractError =
    analysisJob?.status === "succeeded" && !completedProfileId
      ? {
          reasonCode: "INVALID_API_RESPONSE",
          detail: "Completed analysis did not include a vocal profile ID.",
          retryable: false,
        }
      : null;
  const displayedAnalysisError = analysisError ?? terminalAnalysisError ?? successContractError;
  const audioUrl = useMemo(() => (audioFile ? URL.createObjectURL(audioFile) : null), [audioFile]);
  const analysisBusy =
    submitAnalysis.isPending ||
    isActiveAnalysisJob(analysisJob) ||
    (analysisJobId !== null && analysisJobQuery.isPending) ||
    (analysisJobId !== null && analysisJobRequestError?.retryable === true);
  const analysisStage = resolveAnalysisStage({
    error: displayedAnalysisError,
    job: analysisJob,
    requestError: analysisJobRequestError,
    submitting: submitAnalysis.isPending,
  });

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    const storedJobId = window.localStorage.getItem(ANALYSIS_JOB_STORAGE_KEY);
    if (storedJobId) queueMicrotask(() => setAnalysisJobId(storedJobId));
  }, []);

  useEffect(() => {
    if (!analysisJobId || !analysisJob) return;
    if (isActiveAnalysisJob(analysisJob)) {
      window.localStorage.setItem(ANALYSIS_JOB_STORAGE_KEY, analysisJobId);
      return;
    }

    const terminalKey = `${analysisJobId}:${analysisJob.status}`;
    if (handledTerminalJob.current === terminalKey) return;
    handledTerminalJob.current = terminalKey;
    analysisIdempotencyKey.current = null;
    if (analysisJob.status !== "succeeded") {
      window.localStorage.removeItem(ANALYSIS_JOB_STORAGE_KEY);
      return;
    }
    if (!completedProfileId) return;

    window.localStorage.removeItem(ANALYSIS_JOB_STORAGE_KEY);
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: vocalAnalysisKeys.health() }),
      queryClient.invalidateQueries({ queryKey: vocalAnalysisKeys.jobs() }),
    ]);
    toast.success("보컬 프로필 분석이 완료됐습니다.");
    router.replace(`/vocal-profiles/${completedProfileId}`);
  }, [analysisJob, analysisJobId, completedProfileId, queryClient, router]);

  useEffect(() => {
    if (!analysisJobId || !analysisJobQuery.error) return;
    const error = normalizeProfileError(analysisJobQuery.error);
    if (error.retryable) return;
    analysisIdempotencyKey.current = null;
    window.localStorage.removeItem(ANALYSIS_JOB_STORAGE_KEY);
  }, [analysisJobId, analysisJobQuery.error]);

  const resetAudio = useCallback(() => {
    setAudioFile(null);
    setAudioDuration(null);
    setPendingLongFile(null);
    setPendingLongDuration(null);
    setPreparationProgress(0);
    setInputError(null);
    setRecorderIssue(null);
    setRecorderState("idle");
    setAnalysisError(null);
    setAnalysisJobId(null);
    analysisIdempotencyKey.current = null;
    window.localStorage.removeItem(ANALYSIS_JOB_STORAGE_KEY);
  }, []);

  const prepareSelectedAudio = useCallback(async (file: File) => {
    setPreparingAudio(true);
    setPreparationProgress(0);
    setInputError(null);
    setRecorderIssue(null);
    try {
      const prepared = await prepareProfileAudio(file, setPreparationProgress);
      setAudioFile(prepared.file);
      setAudioDuration(prepared.durationSeconds);
      analysisIdempotencyKey.current = null;
      setAnalysisError(null);
      toast.success(`분석용 오디오가 준비됐습니다. (${(prepared.file.size / 1024 / 1024).toFixed(1)} MB)`);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : "오디오를 변환하지 못했습니다.");
    } finally {
      setPreparingAudio(false);
    }
  }, []);

  const completeRecording = useCallback(
    (file: File) => {
      void prepareSelectedAudio(file);
    },
    [prepareSelectedAudio],
  );

  const recordingError = useCallback((error: unknown) => {
    setRecorderIssue(recorderIssueFromError(error));
  }, []);

  const recorderStateChanged = useCallback((state: VocalProfileRecorderState) => {
    setRecorderState(state);
    if (state === "requesting_permission" || state === "recording") setRecorderIssue(null);
  }, []);

  const selectFile = async (file: File | null) => {
    if (!file) return;
    setInputError(null);
    setRecorderIssue(null);
    if (file.size > MAX_PROFILE_ANALYSIS_AUDIO_BYTES) {
      setInputError("테스트 오디오는 25MB 이하여야 합니다.");
      return;
    }
    let duration: number | null = null;
    try {
      duration = await readAudioDuration(file);
    } catch {
      // The analyzer remains the source of truth when browser metadata is unavailable.
    }
    if (duration !== null && isLongProfileAudio(duration)) {
      setPendingLongFile(file);
      setPendingLongDuration(duration);
      return;
    }
    await prepareSelectedAudio(file);
  };

  const cancelLongAudio = useCallback(() => {
    setPendingLongFile(null);
    setPendingLongDuration(null);
  }, []);

  const confirmLongAudio = () => {
    if (!pendingLongFile) return;
    const file = pendingLongFile;
    setPendingLongFile(null);
    setPendingLongDuration(null);
    void prepareSelectedAudio(file);
  };

  const analyzeAudio = () => {
    if (!audioFile || analysisBusy) return;
    setAnalysisError(null);
    setAnalysisJobId(null);
    const idempotencyKey = analysisIdempotencyKey.current ?? crypto.randomUUID();
    analysisIdempotencyKey.current = idempotencyKey;
    submitAnalysis.mutate(
      { file: audioFile, idempotencyKey },
      {
        onSuccess: (job) => {
          handledTerminalJob.current = null;
          window.localStorage.setItem(ANALYSIS_JOB_STORAGE_KEY, job.id);
          queryClient.setQueryData(vocalAnalysisKeys.job(job.id), job);
          setAnalysisJobId(job.id);
          void queryClient.invalidateQueries({ queryKey: vocalAnalysisKeys.jobs() });
          toast.success("보컬 분석을 대기열에 추가했습니다.");
        },
        onError: (error) => setAnalysisError(normalizeProfileError(error)),
      },
    );
  };

  if (analysisStage) {
    return (
      <CreationFunnelShell currentStep="analysis">
        <AnalysisStatus
          attempts={analysisJob?.attempts}
          canRetry={audioFile !== null && displayedAnalysisError?.retryable === true}
          error={displayedAnalysisError}
          maxAttempts={analysisJob?.maxAttempts}
          onCheckAgain={() => void analysisJobQuery.refetch()}
          onReset={resetAudio}
          onRetry={analyzeAudio}
          stage={analysisStage}
        />
      </CreationFunnelShell>
    );
  }

  if (analysisJob?.status === "succeeded" && completedProfileId) return null;

  return (
    <CreationFunnelShell currentStep="analysis">
      {pendingLongFile ? (
        <LongAudioDialog
          durationSeconds={pendingLongDuration}
          fileName={pendingLongFile.name}
          onCancel={cancelLongAudio}
          onConfirm={confirmLongAudio}
        />
      ) : null}

      <div className="mt-8 grid gap-10 lg:mt-12 lg:grid-cols-[minmax(0,.9fr)_minmax(29rem,1.1fr)] lg:items-start lg:gap-14">
        <div className="min-w-0">
          <header className="max-w-[34rem]">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">
              Voice analysis
            </p>
            <h1 className="mt-3 text-[clamp(2.35rem,4.2vw,3.45rem)] font-semibold leading-[1.03] tracking-[-0.052em]">
              노래 한 소절로,
              <br />내 목소리의 기준점을 만드세요.
            </h1>
            <p className="mt-5 max-w-[31rem] text-[13px] leading-6 text-muted-foreground sm:text-sm sm:leading-7">
              정해진 음계 없이 평소처럼 편안하게 부르면 됩니다. 이 녹음에서 관찰한 음역과 안정성을 저장한 뒤 실제 근거가
              있는 노래 추천으로 이어집니다.
            </p>
          </header>

          <section aria-labelledby="voice-scan-guide-title" className="mt-10">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">HOW TO RECORD</p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]" id="voice-scan-guide-title">
              가장 편한 키로 불러주세요
            </h2>
            <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
              잘 부르려고 힘주지 않아도 됩니다. 익숙한 한 소절이면 충분해요.
            </p>
            <ol className="mt-5 grid gap-2.5">
              {[
                { icon: Mic2, title: "반주 없이", description: "목소리만 또렷하게 전달해주세요." },
                { icon: Timer, title: "약 10초 권장", description: "5초부터 분석 가능 · 60초 자동 종료" },
                { icon: AudioLines, title: "편안한 음역", description: "최고음에 무리하지 말고 평소처럼 불러주세요." },
                { icon: Upload, title: "파일도 가능", description: "마이크를 쓸 수 없다면 기존 오디오를 올려주세요." },
              ].map(({ description, icon: Icon, title }) => (
                <li className="flex gap-3 rounded-lg border px-4 py-3.5" key={title}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
                    <Icon aria-hidden="true" className="size-3.5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <StatusNotice
              className="mt-5"
              description="결과는 노래 추천을 위한 관찰값이며 의료적 진단이 아닙니다. 본인에게 사용 권한이 있는 음성만 제출해주세요."
              icon={<ShieldCheck />}
            />
          </section>
        </div>

        <VoiceScanInput
          analysisBusy={analysisBusy}
          audioDuration={audioDuration}
          audioFile={audioFile}
          audioUrl={audioUrl}
          inputError={inputError}
          onAnalyze={analyzeAudio}
          onRecordingComplete={completeRecording}
          onRecordingError={recordingError}
          onRecorderStateChange={recorderStateChanged}
          onReset={resetAudio}
          onSelectFile={(file) => void selectFile(file)}
          preparationProgress={preparationProgress}
          preparing={preparingAudio}
          recorderIssue={recorderIssue}
          recorderState={recorderState}
        />
      </div>

      {audioFile ? (
        <StatusNotice
          className="mt-10"
          description="준비된 오디오는 분석 요청 전까지 브라우저 안에서만 미리 확인합니다."
          icon={<Check />}
          tone="success"
        />
      ) : null}
    </CreationFunnelShell>
  );
}
