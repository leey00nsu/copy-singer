"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Download, LoaderCircle, Mic2, RefreshCw, Sparkles, Square, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/cn";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Separator } from "@/shared/ui/separator";
import { StatusNotice } from "@/shared/ui/status-notice";
import {
  ADMIN_CUSTOM_MIXING_LIMITS,
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

function TargetDropzone({
  disabled,
  file,
  onFile,
}: {
  disabled: boolean;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const audioUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const acceptFile = useCallback(
    (candidate?: File) => {
      if (!candidate) return;
      if (!(candidate.type.startsWith("audio/") || candidate.name.match(/\.(wav|mp3|flac|m4a|ogg|aac|webm)$/i))) {
        toast.error("지원하는 audio 파일 형식이 아닙니다.");
        return;
      }
      if (candidate.size > ADMIN_CUSTOM_MIXING_LIMITS.targetBytes) {
        toast.error(`Target audio는 ${formatBytes(ADMIN_CUSTOM_MIXING_LIMITS.targetBytes)} 이하여야 합니다.`);
        return;
      }
      onFile(candidate);
    },
    [onFile],
  );

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b border-border/70 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
              <UploadCloud className="size-4" />
            </div>
            <div>
              <CardTitle className="text-[15px]">Target performance</CardTitle>
              <CardDescription className="mt-1 text-xs">Vocal or full mix · up to 5 minutes</CardDescription>
            </div>
          </div>
          {file ? (
            <Button
              aria-label="Remove target audio"
              disabled={disabled}
              onClick={() => onFile(null)}
              size="icon-sm"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {file && audioUrl ? (
          <div className="px-5 py-5">
            <AudioWaveformPlayer label="Target performance" src={audioUrl} />
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <Button
                aria-label="Replace target audio"
                disabled={disabled}
                onClick={() => document.getElementById(inputId)?.click()}
                size="icon-sm"
                variant="outline"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 px-6 py-10 text-center transition-colors hover:bg-muted/40",
              dragging && "bg-muted/60",
              disabled && "pointer-events-none opacity-60",
            )}
            htmlFor={inputId}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              acceptFile(event.dataTransfer.files[0]);
            }}
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <UploadCloud className="size-5" />
            </span>
            <span className="text-sm font-medium">Drop audio here or browse</span>
            <span className="text-xs text-muted-foreground">WAV, MP3, FLAC, M4A · max 256 MB</span>
          </label>
        )}
        <input
          accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.aac,.webm"
          className="sr-only"
          disabled={disabled}
          id={inputId}
          onChange={(event) => acceptFile(event.target.files?.[0])}
          type="file"
        />
      </CardContent>
    </Card>
  );
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
      toast.success("커스텀 믹싱 작업을 GPU 큐에 등록했습니다.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "커스텀 믹싱을 시작하지 못했습니다.");
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
    if (job.status === "succeeded") toast.success("커스텀 믹싱 결과가 준비됐습니다.");
    else toast.error(job.error ?? "커스텀 믹싱이 실패했습니다.");
  }, [job]);

  const submit = () => {
    if (!selectedProfile || !targetFile) {
      toast.error("보컬 프로필과 target audio를 선택해주세요.");
      return;
    }
    if (!selectedProfile.referenceReady) {
      toast.error("선택한 프로필에는 준비된 보컬 reference가 없습니다.");
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start">
      <section className="space-y-4">
        <div className="grid gap-1.5">
          <label className="text-[11px] font-medium" htmlFor="admin-custom-mixing-profile">
            보컬 프로필
          </label>
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
                  {profile.referenceReady ? "" : " (reference 없음)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProfile && !selectedProfile.referenceReady ? (
            <p className="text-[11px] text-destructive">
              이 프로필에는 준비된 보컬 reference가 없어 믹싱할 수 없습니다.
            </p>
          ) : null}
        </div>
        <TargetDropzone disabled={busy} file={targetFile} onFile={setTargetFile} />
        <Button
          className="w-full"
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
        {profilesQuery.isError ? (
          <StatusNotice
            description="보컬 프로필을 불러오지 못했습니다. 잠시 뒤 다시 시도해주세요."
            title="프로필 로드 실패"
            tone="destructive"
          />
        ) : null}
      </section>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b border-border/70 px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-[15px]">Generated vocal</CardTitle>
              <CardDescription className="mt-1 text-xs">Your converted result appears here.</CardDescription>
            </div>
            {job ? <Badge variant={job.status === "succeeded" ? "default" : "secondary"}>{job.status}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="flex min-h-[300px] flex-col justify-between p-6">
          {job?.status === "succeeded" ? (
            <div>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Conversion complete</p>
                  <p className="mt-1 text-xs text-muted-foreground">Listen or download the result audio.</p>
                </div>
                <Sparkles className="size-5 text-data-accent-foreground" />
              </div>
              <AudioWaveformPlayer
                label="Generated vocal"
                src={`/api/admin/custom-mixing/${encodeURIComponent(job.id)}/audio`}
              />
              <a
                className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}
                download={`custom-mixing-${job.id}.wav`}
                href={`/api/admin/custom-mixing/${encodeURIComponent(job.id)}/audio`}
              >
                <Download className="size-4" /> Download WAV
              </a>
            </div>
          ) : busy ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <LoaderCircle className="size-7 animate-spin motion-reduce:animate-none text-data-accent-foreground" />
              <p className="mt-6 text-base font-semibold">Shaping the new vocal</p>
              <p className="mt-2 max-w-[280px] text-sm leading-6 text-muted-foreground">
                {job?.status === "queued"
                  ? "Waiting for processing capacity to become available."
                  : "Preserving phrasing, pitch and timing while transferring the voice."}
              </p>
              <Progress className="mt-6 h-1.5 w-full max-w-[280px]" value={job?.status === "processing" ? 66 : 24} />
            </div>
          ) : job?.status === "failed" ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <CircleAlert className="size-6 text-destructive" />
              <p className="mt-5 font-semibold">Conversion stopped</p>
              <p className="mt-2 max-w-[300px] text-sm leading-6 text-muted-foreground">
                {job.error ?? "Check the source files and try again."}
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-center">
              <div className="relative flex items-center justify-center rounded-xl bg-muted/40 py-10">
                <Mic2 className="size-8 text-muted-foreground/60" />
              </div>
              <Separator className="my-7" />
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs">
                  01
                </span>
                <div>
                  <p className="text-sm font-medium">Select a profile and upload audio</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Your stored vocal reference is combined with the uploaded performance.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs">
                  02
                </span>
                <div>
                  <p className="text-sm font-medium">Convert and listen</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    GPU jobs may take a few minutes on the first cold start.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            {busy ? (
              <Button className="w-full" onClick={() => void clearJob()} variant="outline">
                <Square className="size-3.5" /> Cancel conversion
              </Button>
            ) : job ? (
              <Button className="w-full" onClick={() => void clearJob()} variant="outline">
                <RefreshCw className="size-3.5" /> Start another
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
