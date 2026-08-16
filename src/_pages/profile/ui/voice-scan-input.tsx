"use client";

import { Activity, CheckCircle2, FileAudio, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import { type ReactNode, useId } from "react";
import { TicketConsumptionConfirmDialog } from "@/entities/ticket";
import { SUPPORTED_AUDIO_UPLOAD_ACCEPT, SUPPORTED_AUDIO_UPLOAD_FORMAT_LABEL } from "@/shared/lib/audio";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { Button } from "@/shared/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/shared/ui/progress";
import { StatusNotice } from "@/shared/ui/status-notice";
import { canAnalyzeVoiceScan, type RecorderIssue } from "../model/voice-scan";
import { VocalProfileRecorder, type VocalProfileRecorderState } from "./vocal-profile-recorder";

export const ACCEPTED_VOICE_SCAN_AUDIO = SUPPORTED_AUDIO_UPLOAD_ACCEPT;

export type VoiceScanAudioSource = "recording" | "upload";

type VoiceScanInputProps = {
  analysisBusy?: boolean;
  audioDuration: number | null;
  audioFile: File | null;
  audioSource: VoiceScanAudioSource | null;
  audioPreview?: ReactNode;
  audioUrl: string | null;
  inputError?: string | null;
  analysisTickets?: { balance: number; cost: number } | null;
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
  audioSource,
  audioPreview,
  audioUrl,
  inputError,
  analysisTickets,
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
  const analysisTicketsEmpty = analysisTickets ? analysisTickets.balance < analysisTickets.cost : false;

  return (
    <section aria-labelledby="voice-scan-input-title" className="overflow-hidden rounded-xl border bg-background">
      <header className="px-5 pt-5 sm:px-6 sm:pt-6">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">VOICE INPUT</p>
        <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em]" id="voice-scan-input-title">
          내 목소리 들려주기
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          지금 한 소절을 녹음하거나, 기존 녹음 파일을 올려주세요.
        </p>
        {analysisTickets ? (
          <dl className="mt-4 rounded-lg bg-muted/35 p-3 text-xs">
            <div>
              <dt className="text-muted-foreground">분석 티켓</dt>
              <dd className="mt-1 font-semibold tabular-nums">{analysisTickets.balance}장</dd>
            </div>
          </dl>
        ) : null}
      </header>

      <div className="p-5 sm:p-6">
        {analysisTicketsEmpty ? (
          <StatusNotice
            description="새 보컬 프로필을 만들려면 분석 티켓이 필요해요."
            title="분석 티켓이 없어요"
            tone="warning"
          />
        ) : preparing ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
            <LoaderCircle
              aria-hidden="true"
              className="size-7 animate-spin text-data-accent-foreground motion-reduce:animate-none"
            />
            <p className="mt-4 font-medium">첫 음부터 최대 60초를 준비하는 중</p>
            <p className="mt-2 text-sm text-muted-foreground">분석할 구간을 준비하고 있어요.</p>
            <Progress className="mt-6 w-full max-w-sm" value={Math.round(preparationProgress * 100)}>
              <ProgressLabel>오디오 준비</ProgressLabel>
              <ProgressValue>{() => `${Math.round(preparationProgress * 100)}%`}</ProgressValue>
            </Progress>
          </div>
        ) : audioFile && audioUrl ? (
          <div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/35 p-3" data-audio-source={audioSource}>
              <span className="flex size-10 items-center justify-center rounded-md border bg-muted/40">
                <FileAudio aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                {audioSource === "upload" ? <p className="truncate text-sm font-medium">{audioFile.name}</p> : null}
                <p className={`${audioSource === "upload" ? "mt-1" : ""} text-xs text-muted-foreground`}>
                  {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                  {audioDuration !== null ? ` · 약 ${Math.ceil(audioDuration)}초` : ""}
                </p>
              </div>
              <CheckCircle2 aria-label="분석용 오디오 준비됨" className="size-5 text-success-foreground" />
            </div>

            {audioPreview ??
              (audioUrl ? <AudioWaveformPlayer className="mt-5" label="제출할 보컬 녹음" src={audioUrl} /> : null)}

            <StatusNotice
              className="mt-4"
              data-audio-status={durationAccepted ? "valid" : "invalid"}
              data-testid="audio-duration-notice"
              description={
                durationAccepted
                  ? audioDuration !== null && audioDuration < 10
                    ? "약 10초까지 녹음하면 더 충분한 음성 구간을 전달할 수 있어요."
                    : "결과는 저장된 보컬 프로필에서 확인할 수 있어요."
                  : "새 오디오를 녹음하거나 선택해 주세요."
              }
              title={durationAccepted ? "분석할 오디오가 준비됐어요" : "5초보다 짧아요"}
              tone={durationAccepted ? "success" : "destructive"}
            />

            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
              <TicketConsumptionConfirmDialog
                actionName="보컬 분석"
                confirmLabel="분석 시작"
                cost={analysisTickets?.cost ?? 0}
                kind="VOCAL_ANALYSIS"
                onConfirm={onAnalyze}
                triggerProps={{ disabled: analysisBusy || !durationAccepted || analysisTickets === null, size: "lg" }}
              >
                {analysisBusy ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Activity aria-hidden="true" className="size-4" />
                )}
                {analysisBusy ? "분석 작업 확인 중…" : "내 보컬 프로필 만들기"}
              </TicketConsumptionConfirmDialog>
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
              <StatusNotice
                description={recorderIssue.description}
                role="alert"
                title={recorderIssue.title}
                tone="warning"
              />
            ) : null}

            {inputError ? (
              <StatusNotice description={inputError} title="오디오를 준비하지 못했어요" tone="destructive" />
            ) : null}

            <label
              aria-disabled={analysisBusy || recorderActive}
              className="mx-1 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/30 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 sm:mx-3"
              htmlFor={uploadId}
            >
              <Upload aria-hidden="true" className="size-4" /> 녹음 파일로 분석하기
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
            <p className="text-center text-xs text-muted-foreground">
              지원 형식: {SUPPORTED_AUDIO_UPLOAD_FORMAT_LABEL} · 최대 25MB / 60초
            </p>
          </div>
        )}
        {!analysisTicketsEmpty && analysisTickets && analysisTickets.cost > 0 ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            분석을 시작하면 분석 티켓 {analysisTickets.cost}장을 사용해요.
          </p>
        ) : null}
      </div>
    </section>
  );
}
