"use client";

import { Activity, AlertTriangle, CheckCircle2, FileAudio, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import { type ReactNode, useId } from "react";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { Button } from "@/shared/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/shared/ui/progress";
import { canAnalyzeVoiceScan, type RecorderIssue } from "../model/voice-scan";
import { VocalProfileRecorder, type VocalProfileRecorderState } from "./vocal-profile-recorder";

export const ACCEPTED_VOICE_SCAN_AUDIO = ".wav,.mp3,.m4a,.webm,audio/wav,audio/mpeg,audio/mp4,audio/webm";

type VoiceScanInputProps = {
  analysisBusy?: boolean;
  audioDuration: number | null;
  audioFile: File | null;
  audioPreview?: ReactNode;
  audioUrl: string | null;
  inputError?: string | null;
  onAnalyze: () => void;
  onRecordingComplete: (file: File, durationMs: number) => void;
  onRecordingError: (error: unknown) => void;
  onRecorderStateChange?: (state: VocalProfileRecorderState) => void;
  onReset: () => void;
  onSelectFile: (file: File | null) => void;
  preparationProgress?: number;
  preparing?: boolean;
  recorderIssue?: RecorderIssue | null;
  recorderOverride?: ReactNode;
  recorderState?: VocalProfileRecorderState;
};

export function VoiceScanInput({
  analysisBusy = false,
  audioDuration,
  audioFile,
  audioPreview,
  audioUrl,
  inputError,
  onAnalyze,
  onRecordingComplete,
  onRecordingError,
  onRecorderStateChange,
  onReset,
  onSelectFile,
  preparationProgress = 0,
  preparing = false,
  recorderIssue,
  recorderOverride,
  recorderState = "idle",
}: VoiceScanInputProps) {
  const uploadId = useId();
  const recorderActive = ["requesting_permission", "recording", "stopping"].includes(recorderState);
  const durationAccepted = canAnalyzeVoiceScan(audioDuration);

  return (
    <section aria-labelledby="voice-scan-input-title" className="overflow-hidden rounded-xl border bg-background">
      <header className="border-b px-5 py-5 sm:px-6">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">VOICE INPUT</p>
        <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em]" id="voice-scan-input-title">
          목소리 샘플 만들기
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          마이크로 바로 녹음하거나 가지고 있는 오디오 파일을 사용할 수 있어요.
        </p>
      </header>

      <div className="p-5 sm:p-6">
        {preparing ? (
          <div className="flex min-h-64 flex-col items-center justify-center border-y px-5 py-10 text-center">
            <LoaderCircle
              aria-hidden="true"
              className="size-7 animate-spin text-data-accent-foreground motion-reduce:animate-none"
            />
            <p className="mt-4 font-medium">첫 음부터 최대 60초를 준비하는 중</p>
            <p className="mt-2 text-sm text-muted-foreground">원본은 변경하지 않고 분석용 복사본만 압축합니다.</p>
            <Progress className="mt-6 w-full max-w-sm" value={Math.round(preparationProgress * 100)}>
              <ProgressLabel>오디오 준비</ProgressLabel>
              <ProgressValue>{() => `${Math.round(preparationProgress * 100)}%`}</ProgressValue>
            </Progress>
          </div>
        ) : audioFile && audioUrl ? (
          <div>
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="flex size-10 items-center justify-center rounded-md border bg-muted/40">
                <FileAudio aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{audioFile.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                  {audioDuration !== null ? ` · 약 ${Math.ceil(audioDuration)}초` : ""}
                </p>
              </div>
              <CheckCircle2 aria-label="분석용 오디오 준비됨" className="size-5 text-success-foreground" />
            </div>

            {audioPreview ??
              (audioUrl ? <AudioWaveformPlayer className="mt-5" label="제출할 보컬 녹음" src={audioUrl} /> : null)}

            <div className="mt-4 border-y bg-muted/25 px-4 py-3 text-xs leading-5 text-muted-foreground">
              {durationAccepted ? (
                audioDuration !== null && audioDuration < 10 ? (
                  <p>5초 최소 조건을 충족했어요. 약 10초까지 녹음하면 더 충분한 음성 구간을 전달할 수 있어요.</p>
                ) : (
                  <p>분석할 오디오가 준비됐어요. 결과는 저장된 보컬 프로필 상세에서 확인합니다.</p>
                )
              ) : (
                <p className="font-medium text-destructive">5초보다 짧아요. 새 오디오를 녹음하거나 선택해주세요.</p>
              )}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
              <Button disabled={analysisBusy || !durationAccepted} onClick={onAnalyze} size="lg">
                {analysisBusy ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Activity aria-hidden="true" className="size-4" />
                )}
                {analysisBusy ? "분석 작업 확인 중…" : "내 보컬 프로필 만들기"}
              </Button>
              <Button disabled={analysisBusy} onClick={onReset} size="lg" variant="outline">
                <RotateCcw aria-hidden="true" className="size-4" /> 다시 선택
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {recorderOverride ?? (
              <VocalProfileRecorder
                disabled={analysisBusy}
                onComplete={onRecordingComplete}
                onError={onRecordingError}
                onStateChange={onRecorderStateChange}
              />
            )}

            {recorderIssue ? (
              <div
                className="flex gap-3 border border-warning/70 bg-warning px-4 py-3 text-warning-foreground"
                role="alert"
              >
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{recorderIssue.title}</p>
                  <p className="mt-1 text-xs leading-5">{recorderIssue.description}</p>
                </div>
              </div>
            ) : null}

            {inputError ? (
              <div
                className="flex gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive"
                role="alert"
              >
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <p className="text-sm leading-5">{inputError}</p>
              </div>
            ) : null}

            <label
              aria-disabled={analysisBusy || recorderActive}
              className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/30 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
              htmlFor={uploadId}
            >
              <Upload aria-hidden="true" className="size-4" /> 오디오 파일 업로드
              <input
                accept={ACCEPTED_VOICE_SCAN_AUDIO}
                className="sr-only"
                disabled={analysisBusy || recorderActive}
                id={uploadId}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  onSelectFile(file);
                }}
                type="file"
              />
            </label>
            <p className="text-center text-xs text-muted-foreground">WAV, MP3, M4A, WebM · 최대 25MB / 60초</p>
          </div>
        )}
      </div>
    </section>
  );
}
