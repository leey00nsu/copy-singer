"use client";

import { Archive, Check, ChevronDown, FileAudio, LoaderCircle, Plus, RefreshCw, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
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

function message(error: unknown) {
  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
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
      toast.success(`${label} 요청을 완료했습니다.`);
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
        <label className="grid min-w-52 flex-1 gap-1 text-[10px] font-medium">
          믹싱 target 음원
          <input
            accept="audio/*,.flac"
            className={`${fieldClass} py-1.5`}
            disabled={pending !== null}
            name="audio"
            required
            type="file"
          />
        </label>
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
      await replaceAdminSource(songId, {
        sourceUrl: String(formData.get("sourceUrl") ?? ""),
        sourceVideoId: String(formData.get("sourceVideoId") ?? ""),
        sourceLabel: String(formData.get("sourceLabel") ?? ""),
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success("새 출처 분석을 대기열에 등록했습니다.");
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
      className="mt-3 grid gap-2 rounded-lg bg-muted/30 p-3 md:grid-cols-[1fr_9rem_12rem_auto] md:items-end"
    >
      <label className="grid gap-1 text-[10px] font-medium">
        YouTube URL
        <input className={fieldClass} disabled={pending} name="sourceUrl" required type="url" />
      </label>
      <label className="grid gap-1 text-[10px] font-medium">
        Video ID
        <input className={fieldClass} disabled={pending} maxLength={11} minLength={11} name="sourceVideoId" required />
      </label>
      <label className="grid gap-1 text-[10px] font-medium">
        출처 라벨
        <input className={fieldClass} disabled={pending} name="sourceLabel" placeholder="공식 영상" required />
      </label>
      <Button disabled={pending} size="xs" type="submit" variant="outline">
        {pending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} 교체 분석
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
      toast.success("곡을 보관 처리했습니다.");
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
  const adding = pending || loading;
  async function add(formData: FormData) {
    setPending(true);
    try {
      await addAdminSong({
        title: String(formData.get("title") ?? ""),
        artist: String(formData.get("artist") ?? ""),
        originalKey: String(formData.get("originalKey") ?? "").trim() || null,
        sourceUrl: String(formData.get("sourceUrl") ?? ""),
        sourceVideoId: String(formData.get("sourceVideoId") ?? ""),
        sourceLabel: String(formData.get("sourceLabel") ?? ""),
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success("곡을 추가하고 분석을 요청했습니다.");
      router.refresh();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <details className="border-b">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/20">
          새 곡 추가 <Plus className="size-4" />
        </summary>
        <form action={add} className="grid gap-3 border-t bg-muted/10 p-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1 text-[11px] font-medium">
            곡 제목
            <input className={fieldClass} disabled={adding} name="title" required />
          </label>
          <label className="grid gap-1 text-[11px] font-medium">
            아티스트
            <input className={fieldClass} disabled={adding} name="artist" required />
          </label>
          <label className="grid gap-1 text-[11px] font-medium">
            원키
            <input className={fieldClass} disabled={adding} name="originalKey" placeholder="선택" />
          </label>
          <label className="grid gap-1 text-[11px] font-medium">
            YouTube URL
            <input className={fieldClass} disabled={adding} name="sourceUrl" required type="url" />
          </label>
          <label className="grid gap-1 text-[11px] font-medium">
            Video ID
            <input
              className={fieldClass}
              disabled={adding}
              maxLength={11}
              minLength={11}
              name="sourceVideoId"
              required
            />
          </label>
          <label className="grid gap-1 text-[11px] font-medium">
            출처 라벨
            <input className={fieldClass} disabled={adding} name="sourceLabel" placeholder="공식 영상" required />
          </label>
          <div className="md:col-span-2 xl:col-span-3 flex justify-end">
            <Button disabled={adding} size="sm" type="submit">
              {adding ? <LoaderCircle className="animate-spin" /> : <Plus />} 추가 및 분석
            </Button>
          </div>
        </form>
      </details>
      {entries.length ? (
        entries.map((entry) => <CatalogRow entry={entry} key={entry.id} />)
      ) : (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">조건에 맞는 곡이 없습니다.</div>
      )}
    </div>
  );
}
