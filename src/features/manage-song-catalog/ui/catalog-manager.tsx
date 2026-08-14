"use client";

import { Archive, Check, ChevronDown, FileAudio, LoaderCircle, Plus, RefreshCw, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { SUPPORTED_AUDIO_UPLOAD_ACCEPT, SUPPORTED_AUDIO_UPLOAD_FORMAT_LABEL } from "@/shared/lib/audio";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  addAdminSong,
  archiveAdminSongClient,
  publishAdminSource,
  replaceAdminSource,
  retryAdminAnalysis,
  uploadAdminTarget,
} from "../api/client";
import type { AdminCatalogEntryView, AdminCatalogSourceView } from "../model/view";

const fieldClass = "h-9 min-w-0 rounded-md border bg-background px-3 text-xs";

type AudioFileInputProps = {
  className?: string;
  disabled: boolean;
  label: string;
  textClassName?: string;
};

function AudioFileInput({ className, disabled, label, textClassName = "text-[10px]" }: AudioFileInputProps) {
  const inputId = useId();
  const hintId = `${inputId}-formats`;

  return (
    <div className={`grid gap-1 ${textClassName} ${className ?? ""}`}>
      <label className="font-medium" htmlFor={inputId}>
        {label}
      </label>
      <input
        accept={SUPPORTED_AUDIO_UPLOAD_ACCEPT}
        aria-describedby={hintId}
        className={`${fieldClass} py-1.5`}
        disabled={disabled}
        id={inputId}
        name="audio"
        required
        type="file"
      />
      <p className="font-normal text-muted-foreground" id={hintId}>
        지원 형식: {SUPPORTED_AUDIO_UPLOAD_FORMAT_LABEL}
      </p>
    </div>
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "요청을 처리하지 못했어요.";
}

function StatusBadge({ value }: { value: string }) {
  const destructive = value === "FAILED" || value === "UNAVAILABLE";
  return (
    <Badge
      variant={
        destructive
          ? "destructive"
          : value === "ACTIVE" || value === "PUBLISHED" || value === "READY" || value === "SUCCEEDED"
            ? "default"
            : "secondary"
      }
    >
      {value.toLowerCase()}
    </Badge>
  );
}

function SourceActions({ songId, source }: { songId: string; source: AdminCatalogSourceView }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<unknown>) {
    setPending(label);
    try {
      await action();
      toast.success(`${label}을 완료했어요.`);
      router.refresh();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setPending(null);
    }
  }

  async function upload(formData: FormData) {
    const file = formData.get("audio");
    if (!(file instanceof File) || file.size === 0) return;
    await run("target 업로드", () => uploadAdminTarget(source.id, file));
  }

  const publishReady = source.analysisReady && source.targetReady;
  return (
    <div className="mt-3 grid gap-3 border-t pt-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <form action={upload} className="flex min-w-0 flex-wrap items-end gap-2">
        <AudioFileInput className="min-w-52 flex-1" disabled={pending !== null} label="믹싱 target 음원" />
        <Button disabled={pending !== null} size="xs" type="submit" variant="outline">
          {pending === "target 업로드" ? <LoaderCircle className="animate-spin" /> : <Upload />} 업로드
        </Button>
      </form>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        {source.analysisStatus === "FAILED" ? (
          <Button
            disabled={pending !== null}
            onClick={() => void run("분석 재시도", () => retryAdminAnalysis(source.id))}
            size="xs"
            variant="outline"
          >
            <RefreshCw /> 재시도
          </Button>
        ) : null}
        <Button
          disabled={pending !== null || !publishReady}
          onClick={() => {
            if (window.confirm("이 출처와 분석·target을 추천 카탈로그에 공개할까요?"))
              void run("공개", () => publishAdminSource(songId, source.id));
          }}
          size="xs"
        >
          {pending === "공개" ? <LoaderCircle className="animate-spin" /> : <Check />} 공개
        </Button>
      </div>
    </div>
  );
}

function ReplaceSourceForm({ songId }: { songId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    setPending(true);
    try {
      const audio = formData.get("audio");
      if (!(audio instanceof File) || audio.size === 0) throw new Error("교체할 음원 파일을 선택해 주세요.");
      await replaceAdminSource(
        songId,
        {
          sourceUrl: String(formData.get("sourceUrl") ?? ""),
          idempotencyKey: crypto.randomUUID(),
        },
        audio,
      );
      toast.success("새 출처와 음원을 저장하고 Modal 분석을 요청했어요.");
      router.refresh();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      action={submit}
      className="mt-3 grid gap-2 rounded-lg bg-muted/30 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
    >
      <label className="grid gap-1 text-[10px] font-medium">
        YouTube URL
        <input className={fieldClass} disabled={pending} name="sourceUrl" required type="url" />
      </label>
      <AudioFileInput disabled={pending} label="교체 음원" />
      <Button disabled={pending} size="xs" type="submit" variant="outline">
        {pending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} 출처와 음원 교체
      </Button>
    </form>
  );
}

function CatalogRow({ entry }: { entry: AdminCatalogEntryView }) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const latest = entry.song.sources[0];
  async function archive() {
    if (!window.confirm(`${entry.song.title}을 카탈로그에서 보관 처리할까요?`)) return;
    setArchiving(true);
    try {
      await archiveAdminSongClient(entry.song.id);
      toast.success("곡을 보관 처리했어요.");
      router.refresh();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setArchiving(false);
    }
  }
  return (
    <details className="group border-b last:border-b-0">
      <summary className="grid cursor-pointer list-none gap-2 px-4 py-3 hover:bg-muted/20 sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto] sm:items-center">
        <span className="text-xs tabular-nums text-muted-foreground">#{entry.position}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{entry.song.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{entry.song.artist}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <StatusBadge value={entry.song.lifecycleStatus} />
          {latest?.analysisStatus ? <StatusBadge value={latest.analysisStatus} /> : null}
        </div>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t bg-muted/10 px-4 py-4">
        {entry.song.sources.map((source) => (
          <div className="mb-3 rounded-xl border bg-background p-3 last:mb-0" key={source.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium">
                  revision {source.revision} · {source.sourceLabel}
                </p>
                <a
                  className="mt-1 block text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                  href={source.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.sourceVideoId}
                </a>
                {source.analysisError ? (
                  <p className="mt-1 text-[10px] text-destructive">{source.analysisError}</p>
                ) : null}
                {source.estimatedKey ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    분석 원키 {source.estimatedKey}
                    {source.keyConfidence === null ? "" : ` · 신뢰도 ${Math.round(source.keyConfidence * 100)}%`}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1">
                <StatusBadge value={source.status} />
                <Badge variant={source.targetReady ? "default" : "secondary"}>
                  <FileAudio /> target {source.targetReady ? "ready" : "missing"}
                </Badge>
              </div>
            </div>
            <SourceActions songId={entry.song.id} source={source} />
          </div>
        ))}
        <ReplaceSourceForm songId={entry.song.id} />
        {entry.song.lifecycleStatus !== "ARCHIVED" ? (
          <div className="mt-3 flex justify-end">
            <Button disabled={archiving} onClick={() => void archive()} size="xs" variant="destructive">
              {archiving ? <LoaderCircle className="animate-spin" /> : <Archive />} 보관
            </Button>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function CatalogManager({ entries, loading = false }: { entries: AdminCatalogEntryView[]; loading?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const adding = pending || loading;
  async function add(formData: FormData) {
    setPending(true);
    try {
      const audio = formData.get("audio");
      if (!(audio instanceof File) || audio.size === 0) throw new Error("분석할 음원 파일을 선택해 주세요.");
      await addAdminSong(
        {
          title: String(formData.get("title") ?? ""),
          artist: String(formData.get("artist") ?? ""),
          sourceUrl: String(formData.get("sourceUrl") ?? ""),
          idempotencyKey: crypto.randomUUID(),
        },
        audio,
      );
      toast.success("음원을 저장하고 Modal 분석을 요청했어요.");
      setAddOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <Button disabled={loading} onClick={() => router.refresh()} type="button" variant="outline">
          <RefreshCw /> 새로고침
        </Button>
        <Dialog onOpenChange={setAddOpen} open={addOpen}>
          <DialogTrigger render={<Button disabled={loading} />}>
            <Plus /> 음원 추가
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>음원 추가</DialogTitle>
              <DialogDescription>
                곡 정보와 사용 권한이 있는 음원을 등록해요. Video ID는 URL에서 추출하고, 원키는 Modal 분석으로 추정해요.
              </DialogDescription>
            </DialogHeader>
            <form action={add} className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-[11px] font-medium">
                곡 제목
                <input className={fieldClass} disabled={adding} name="title" required />
              </label>
              <label className="grid gap-1 text-[11px] font-medium">
                아티스트
                <input className={fieldClass} disabled={adding} name="artist" required />
              </label>
              <label className="grid gap-1 text-[11px] font-medium sm:col-span-2">
                YouTube URL
                <input className={fieldClass} disabled={adding} name="sourceUrl" required type="url" />
              </label>
              <AudioFileInput
                className="sm:col-span-2"
                disabled={adding}
                label="분석 및 믹싱용 음원"
                textClassName="text-[11px]"
              />
              <DialogFooter className="sm:col-span-2">
                <DialogClose disabled={adding} render={<Button type="button" variant="outline" />}>
                  취소
                </DialogClose>
                <Button disabled={adding} type="submit">
                  {adding ? <LoaderCircle className="animate-spin" /> : <Upload />} 등록 및 분석 요청
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-hidden rounded-xl border bg-background">
        {entries.length ? (
          entries.map((entry) => <CatalogRow entry={entry} key={entry.id} />)
        ) : (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">조건에 맞는 곡이 없어요.</div>
        )}
      </div>
    </div>
  );
}
