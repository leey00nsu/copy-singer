"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AudioLines,
  Download,
  FileAudio,
  LoaderCircle,
  MicVocal,
  RefreshCw,
  Sparkles,
  Square,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { MixingStatusBadge, type PublicMixingJobStatus } from "@/entities/mixing-job";
import { cn } from "@/shared/lib/cn";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Progress } from "@/shared/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { StatePanel } from "@/shared/ui/state-panel";
import { StatusNotice } from "@/shared/ui/status-notice";
import {
  ADMIN_CUSTOM_MIXING_LIMITS,
  type AdminCustomMixingJob,
  adminCustomMixingConversionQueryOptions,
  adminCustomMixingKeys,
  adminCustomMixingProfilesQueryOptions,
  deleteAdminCustomMixingMutationOptions,
  isActiveAdminCustomMixing,
  submitAdminCustomMixingMutationOptions,
} from "..";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TargetAudioInput({
  disabled,
  file,
  onFile,
}: {
  disabled: boolean;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const inputId = useId();

  const acceptFile = (candidate?: File) => {
    if (!candidate) return;
    if (!(candidate.type.startsWith("audio/") || candidate.name.match(/\.(wav|mp3|flac|m4a|ogg|aac|webm)$/i))) {
      toast.error("지원하는 오디오 형식이 아니에요.");
      return;
    }
    if (candidate.size > ADMIN_CUSTOM_MIXING_LIMITS.targetBytes) {
      toast.error(`음원은 ${formatBytes(ADMIN_CUSTOM_MIXING_LIMITS.targetBytes)} 이하여야 해요.`);
      return;
    }
    onFile(candidate);
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>target 음원</Label>
      <input
        accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.aac,.webm"
        className="sr-only"
        disabled={disabled}
        id={inputId}
        onChange={(event) => acceptFile(event.target.files?.[0])}
        type="file"
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-data-accent/15 text-data-accent-foreground">
            <FileAudio className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{file.name}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{formatBytes(file.size)} · 최대 5분</p>
          </div>
          <Button
            aria-label="음원 제거"
            disabled={disabled}
            onClick={() => onFile(null)}
            size="icon-sm"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <label
          className={cn(
            "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
            disabled && "pointer-events-none opacity-60",
          )}
          htmlFor={inputId}
        >
          <UploadCloud className="size-4" /> 음원 파일 선택
        </label>
      )}
    </div>
  );
}

function publicStatus(status: AdminCustomMixingJob["status"]): PublicMixingJobStatus {
  if (status === "queued") return "submitted";
  return status;
}

export function AdminCustomMixingPanel() {
  const queryClient = useQueryClient();
  const profilesQuery = useQuery(adminCustomMixingProfilesQueryOptions());
  const [profileId, setProfileId] = useState<string>("");
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const jobQuery = useQuery(adminCustomMixingConversionQueryOptions(jobId));
  const submitMutation = useMutation({
    ...submitAdminCustomMixingMutationOptions(),
    onSuccess: (nextJob) => {
      queryClient.setQueryData(adminCustomMixingKeys.conversion(nextJob.id), nextJob);
      setJobId(nextJob.id);
      toast.success("커스텀 믹싱을 시작했어요.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "커스텀 믹싱을 시작하지 못했어요.");
    },
  });
  const deleteMutation = useMutation(deleteAdminCustomMixingMutationOptions());
  const job = jobQuery.data ?? null;
  const profiles = profilesQuery.data?.profiles ?? [];
  const selectedProfile = profiles.find((profile) => profile.id === profileId) ?? null;
  const busy = submitMutation.isPending || isActiveAdminCustomMixing(job);
  const terminalNoticeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!job || (job.status !== "succeeded" && job.status !== "failed")) return;
    const noticeKey = `${job.id}:${job.status}`;
    if (terminalNoticeRef.current === noticeKey) return;
    terminalNoticeRef.current = noticeKey;
    if (job.status === "succeeded") toast.success("커스텀 믹싱 결과가 준비됐어요.");
    else toast.error(job.error ?? "커스텀 믹싱을 완료하지 못했어요.");
  }, [job]);

  const submit = () => {
    if (!selectedProfile || !targetFile) {
      toast.error("보컬 프로필과 target 음원을 선택해 주세요.");
      return;
    }
    if (!selectedProfile.referenceReady) {
      toast.error("선택한 프로필에는 사용할 수 있는 보컬 reference가 없어요.");
      return;
    }
    const data = new FormData();
    data.append("profileId", selectedProfile.id);
    data.append("target_audio", targetFile);
    setJobId(null);
    submitMutation.mutate(data);
  };

  const clearJob = async () => {
    const currentJobId = jobId;
    if (currentJobId) {
      await deleteMutation.mutateAsync(currentJobId).catch(() => undefined);
      queryClient.removeQueries({ queryKey: adminCustomMixingKeys.conversion(currentJobId), exact: true });
    }
    setJobId(null);
  };

  const audioHref = job ? `/api/admin/custom-mixing/${encodeURIComponent(job.id)}/audio` : null;

  return (
    <div className="mx-auto w-full max-w-[52rem]">
      <section aria-labelledby="custom-mixing-form-title" className="rounded-2xl border bg-background p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold" id="custom-mixing-form-title">
          <MicVocal className="size-4" /> 커스텀 믹싱 실행
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          저장된 보컬 프로필과 임시 음원으로 AI 믹싱을 만들어요. 업로드한 음원과 결과는 저장하지 않아요.
        </p>

        <div className="mt-5 grid gap-5">
          <div className="grid gap-1.5">
            <Label htmlFor="admin-custom-mixing-profile">보컬 프로필</Label>
            <Select
              disabled={busy || profilesQuery.isPending}
              onValueChange={(value) => value && setProfileId(value)}
              value={profileId}
            >
              <SelectTrigger className="w-full" id="admin-custom-mixing-profile">
                <SelectValue>{selectedProfile?.displayName ?? "보컬 프로필 선택"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.displayName}
                    {profile.referenceReady ? "" : " · reference 없음"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProfile && !selectedProfile.referenceReady ? (
              <p className="text-xs text-destructive" role="alert">
                이 프로필에는 사용할 수 있는 보컬 reference가 없어 커스텀 믹싱을 만들 수 없어요.
              </p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <TargetAudioInput disabled={busy} file={targetFile} onFile={setTargetFile} />
            <p className="text-[10px] text-muted-foreground">WAV·MP3·FLAC·M4A · 최대 256MB · 5분 이내</p>
          </div>

          {profilesQuery.isError ? (
            <StatusNotice
              description="보컬 프로필을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요."
              title="프로필을 불러오지 못했어요"
              tone="destructive"
            />
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="sm:flex-1"
              disabled={!selectedProfile?.referenceReady || !targetFile || busy}
              onClick={() => void submit()}
              size="lg"
            >
              {submitMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {submitMutation.isPending ? "업로드 중…" : "커스텀 믹싱 시작"}
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="custom-mixing-result-title" className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold" id="custom-mixing-result-title">
          <AudioLines className="size-4" /> 결과
        </h2>
        <div className="mt-3 overflow-hidden rounded-2xl border bg-background">
          {job?.status === "succeeded" && audioHref ? (
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">믹싱 결과가 준비됐어요</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    결과는 저장하지 않으니 필요한 경우 지금 다운로드해 주세요.
                  </p>
                </div>
                <MixingStatusBadge status="succeeded" />
              </div>
              <AudioWaveformPlayer className="mt-5" label="커스텀 믹싱 결과" src={audioHref} />
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a
                  className={cn(buttonVariants(), "sm:flex-1")}
                  download={`custom-mixing-${job.id}.wav`}
                  href={audioHref}
                >
                  <Download className="size-4" /> 결과 WAV 다운로드
                </a>
                <Button onClick={() => void clearJob()} variant="outline">
                  <RefreshCw className="size-3.5" /> 새 작업 시작
                </Button>
              </div>
            </div>
          ) : busy ? (
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {job?.status === "queued" ? "믹싱 순서를 기다리고 있어요" : "AI 믹싱을 진행하고 있어요"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    작업이 끝나기 전에 이 화면을 벗어나면 결과를 다시 확인할 수 없어요.
                  </p>
                </div>
                <MixingStatusBadge status={job ? publicStatus(job.status) : "processing"} />
              </div>
              <Progress className="mt-5" value={job?.status === "processing" ? 66 : 24} />
              <Button className="mt-4" onClick={() => void clearJob()} variant="outline">
                <Square className="size-3.5" /> 작업 취소
              </Button>
            </div>
          ) : job?.status === "failed" ? (
            <div className="p-5">
              <StatusNotice
                action={
                  <Button onClick={() => void clearJob()} size="sm" variant="outline">
                    <RefreshCw className="size-3.5" /> 새 작업 시작
                  </Button>
                }
                description={job.error ?? "커스텀 믹싱을 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요."}
                title="커스텀 믹싱을 완료하지 못했어요"
                tone="destructive"
              />
            </div>
          ) : (
            <StatePanel
              description="보컬 프로필과 target 음원을 선택해 커스텀 믹싱을 시작하면 결과가 여기에 표시돼요."
              icon={<AudioLines />}
              title="아직 커스텀 믹싱 결과가 없어요"
            />
          )}
        </div>
      </section>
    </div>
  );
}
