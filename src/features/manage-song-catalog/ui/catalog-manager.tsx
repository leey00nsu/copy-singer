"use client";

import {
  Archive,
  Check,
  ChevronDown,
  ExternalLink,
  FileAudio,
  LoaderCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Upload,
} from "lucide-react";
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
import { StatusNotice } from "@/shared/ui/status-notice";
import {
  addAdminSong,
  archiveAdminSongClient,
  publishAdminSource,
  replaceAdminSource,
  retryAdminAnalysis,
  uploadAdminTarget,
} from "../api/client";
import { type AdminCatalogSourcePresentation, presentAdminCatalogSources } from "../model/presentation";
import type { AdminCatalogEntryView } from "../model/view";

const fieldClass = "h-9 min-w-0 rounded-md border bg-background px-3 text-xs";
const originalAudioDescription =
  "보컬과 반주가 함께 있는 원곡 파일을 선택하세요. 보컬을 분리해 음역을 분석하고 AI 믹싱의 기준 곡으로 사용해요.";

type AudioFileInputProps = {
  className?: string;
  description?: string;
  disabled: boolean;
  label?: string;
  textClassName?: string;
};

function AudioFileInput({
  className,
  description = originalAudioDescription,
  disabled,
  label = "원곡 음원 파일",
  textClassName = "text-[10px]",
}: AudioFileInputProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;

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
      <p className="font-normal leading-4 text-muted-foreground" id={hintId}>
        {description} 지원 형식: {SUPPORTED_AUDIO_UPLOAD_FORMAT_LABEL}
      </p>
    </div>
  );
}

function YouTubeUrlInput({ disabled }: { disabled: boolean }) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  return (
    <div className="grid gap-1 text-[11px] font-medium sm:col-span-2">
      <label htmlFor={inputId}>YouTube 미리듣기 영상</label>
      <input
        aria-describedby={hintId}
        className={fieldClass}
        disabled={disabled}
        id={inputId}
        name="sourceUrl"
        required
        type="url"
      />
      <p className="font-normal leading-4 text-muted-foreground" id={hintId}>
        사용자가 추천곡을 미리 듣는 영상이에요. 주소에서 영상 ID를 자동으로 확인해요.
      </p>
    </div>
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "요청을 처리하지 못했어요.";
}

function StateBadge({ presentation }: { presentation: AdminCatalogSourcePresentation }) {
  const variant =
    presentation.tone === "destructive" ? "destructive" : presentation.tone === "success" ? "default" : "secondary";
  return <Badge variant={variant}>{presentation.stateLabel}</Badge>;
}

function VersionActions({ presentation, songId }: { presentation: AdminCatalogSourcePresentation; songId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  if (presentation.role === "history") return null;

  async function run(label: string, action: () => Promise<unknown>) {
    setPending(label);
    try {
      await action();
      toast.success(`${label} 작업을 완료했어요.`);
      router.refresh();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setPending(null);
    }
  }

  async function recoverOriginalFile(formData: FormData) {
    const file = formData.get("audio");
    if (!(file instanceof File) || file.size === 0) return;
    await run("원곡 파일 업로드", () => uploadAdminTarget(presentation.source.id, file));
  }

  const showPublish = presentation.role === "pending" || presentation.role === "preparing";
  const showActions = presentation.needsOriginalFileRecovery || presentation.canRetryAnalysis || showPublish;
  if (!showActions) return null;

  return (
    <div className="mt-3 grid gap-3 border-t pt-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      {presentation.needsOriginalFileRecovery ? (
        <form action={recoverOriginalFile} className="flex min-w-0 flex-wrap items-end gap-2">
          <AudioFileInput
            className="min-w-52 flex-1"
            description="이 버전에 대응하는 원곡 파일을 다시 선택하세요."
            disabled={pending !== null}
            label="원곡 파일 다시 업로드"
          />
          <Button disabled={pending !== null} size="xs" type="submit" variant="outline">
            {pending === "원곡 파일 업로드" ? <LoaderCircle className="animate-spin" /> : <Upload />} 업로드
          </Button>
        </form>
      ) : (
        <span />
      )}
      <div className="flex flex-wrap gap-2 lg:justify-end">
        {presentation.canRetryAnalysis ? (
          <Button
            disabled={pending !== null}
            onClick={() => void run("음원 분석 재시도", () => retryAdminAnalysis(presentation.source.id))}
            size="xs"
            variant="outline"
          >
            <RefreshCw /> 분석 다시 시도
          </Button>
        ) : null}
        {showPublish ? (
          <Button
            disabled={pending !== null || !presentation.canPublish}
            onClick={() => void run("추천 공개", () => publishAdminSource(songId, presentation.source.id))}
            size="xs"
            title={presentation.publishBlockedReason ?? undefined}
          >
            {pending === "추천 공개" ? <LoaderCircle className="animate-spin" /> : <Check />} 추천에 공개
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function VersionPanel({ presentation, songId }: { presentation: AdminCatalogSourcePresentation; songId: string }) {
  return (
    <section className="rounded-xl bg-background p-3 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold">{presentation.roleLabel}</p>
            <span className="text-[10px] text-muted-foreground">{presentation.versionLabel}</span>
          </div>
          <a
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            href={presentation.source.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            YouTube 미리듣기 영상 <ExternalLink className="size-3" />
          </a>
          {presentation.source.estimatedKey ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              분석 원키 {presentation.source.estimatedKey}
              {presentation.source.keyConfidence === null
                ? ""
                : ` · 신뢰도 ${Math.round(presentation.source.keyConfidence * 100)}%`}
            </p>
          ) : null}
        </div>
        <StateBadge presentation={presentation} />
      </div>
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{presentation.stateDescription}</p>
      <VersionActions presentation={presentation} songId={songId} />
    </section>
  );
}

function ReplaceSourceDialog({ songId, songTitle }: { songId: string; songTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    try {
      const audio = formData.get("audio");
      if (!(audio instanceof File) || audio.size === 0) throw new Error("새 원곡 음원 파일을 선택해 주세요.");
      await replaceAdminSource(
        songId,
        {
          sourceUrl: String(formData.get("sourceUrl") ?? ""),
          idempotencyKey: crypto.randomUUID(),
        },
        audio,
      );
      toast.success("새 영상과 원곡 파일을 저장하고 음원 분석을 요청했어요.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button size="xs" variant="outline" />}>
        <RefreshCw /> 영상·원곡 교체
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{songTitle} 영상·원곡 교체</DialogTitle>
          <DialogDescription>
            새 영상과 그 영상에 대응하는 원곡 파일 하나로 교체 버전을 준비해요. 분석을 마치고 직접 공개하기 전까지 현재
            버전이 계속 사용돼요.
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="grid gap-4 sm:grid-cols-2">
          <YouTubeUrlInput disabled={pending} />
          <AudioFileInput className="sm:col-span-2" disabled={pending} textClassName="text-[11px]" />
          <DialogFooter className="sm:col-span-2">
            <DialogClose disabled={pending} render={<Button type="button" variant="outline" />}>
              취소
            </DialogClose>
            <Button disabled={pending} type="submit">
              {pending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} 교체 버전 분석 요청
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CatalogVisibilityActions({
  current,
  entry,
}: {
  current: AdminCatalogSourcePresentation | undefined;
  entry: AdminCatalogEntryView;
}) {
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pending, setPending] = useState<"archive" | "restore" | null>(null);

  async function archive() {
    setPending("archive");
    try {
      await archiveAdminSongClient(entry.song.id);
      toast.success("추천에서 제외했어요. 곡 정보와 기존 믹싱 이력은 유지돼요.");
      setArchiveOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setPending(null);
    }
  }

  async function restore() {
    if (!current) return;
    setPending("restore");
    try {
      await publishAdminSource(entry.song.id, current.source.id);
      toast.success("추천에 다시 공개했어요.");
      router.refresh();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setPending(null);
    }
  }

  if (entry.song.lifecycleStatus === "ARCHIVED") {
    return (
      <Button
        disabled={pending !== null || !current?.canPublish}
        onClick={() => void restore()}
        size="xs"
        title={current?.publishBlockedReason ?? (current ? undefined : "다시 공개할 버전을 찾을 수 없어요.")}
      >
        {pending === "restore" ? <LoaderCircle className="animate-spin" /> : <RotateCcw />} 추천에 다시 공개
      </Button>
    );
  }

  return (
    <Dialog onOpenChange={setArchiveOpen} open={archiveOpen}>
      <DialogTrigger render={<Button size="xs" variant="ghost" />}>
        <Archive /> 추천에서 제외
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry.song.title}을 추천에서 제외할까요?</DialogTitle>
          <DialogDescription>
            새 추천 결과에는 이 곡이 표시되지 않아요. 곡 정보, YouTube 영상, 원곡 파일, 분석 결과와 기존 믹싱 이력은
            삭제하지 않고 보관해요.
          </DialogDescription>
        </DialogHeader>
        <StatusNotice
          description="나중에 보관된 곡 filter에서 찾아 추천에 다시 공개할 수 있어요."
          title="데이터는 그대로 유지돼요"
          tone="warning"
        />
        <DialogFooter>
          <DialogClose disabled={pending !== null} render={<Button variant="outline" />}>
            취소
          </DialogClose>
          <Button disabled={pending !== null} onClick={() => void archive()}>
            {pending === "archive" ? <LoaderCircle className="animate-spin" /> : <Archive />} 추천에서 제외
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CatalogRow({ entry }: { entry: AdminCatalogEntryView }) {
  const versions = presentAdminCatalogSources(entry);
  const primaryVersions = versions
    .filter((version) => version.role !== "history")
    .sort((left, right) => Number(right.role === "current") - Number(left.role === "current"));
  const historyVersions = versions.filter((version) => version.role === "history");
  const current = primaryVersions.find((version) => version.role === "current");
  const summaryState =
    entry.song.lifecycleStatus === "ARCHIVED"
      ? current
      : (primaryVersions.find((version) => version.role === "pending") ?? primaryVersions[0]);

  return (
    <details className="group border-b last:border-b-0">
      <summary className="grid cursor-pointer list-none gap-2 px-4 py-3 hover:bg-muted/20 sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto] sm:items-center">
        <span className="text-xs tabular-nums text-muted-foreground">#{entry.position}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{entry.song.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{entry.song.artist}</p>
        </div>
        {summaryState ? <StateBadge presentation={summaryState} /> : <Badge variant="secondary">버전 없음</Badge>}
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-3 border-t bg-muted/10 px-4 py-4">
        {primaryVersions.map((version) => (
          <VersionPanel key={version.source.id} presentation={version} songId={entry.song.id} />
        ))}
        {historyVersions.length ? (
          <details className="rounded-xl bg-background/60 p-3 ring-1 ring-foreground/10">
            <summary className="cursor-pointer text-xs font-medium">이전 버전 {historyVersions.length}개</summary>
            <div className="mt-3 grid gap-3">
              {historyVersions.map((version) => (
                <VersionPanel key={version.source.id} presentation={version} songId={entry.song.id} />
              ))}
            </div>
          </details>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <ReplaceSourceDialog songId={entry.song.id} songTitle={entry.song.title} />
          <CatalogVisibilityActions current={current} entry={entry} />
        </div>
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
      if (!(audio instanceof File) || audio.size === 0) throw new Error("원곡 음원 파일을 선택해 주세요.");
      await addAdminSong(
        {
          title: String(formData.get("title") ?? ""),
          artist: String(formData.get("artist") ?? ""),
          sourceUrl: String(formData.get("sourceUrl") ?? ""),
          idempotencyKey: crypto.randomUUID(),
        },
        audio,
      );
      toast.success("추천곡과 원곡 파일을 저장하고 음원 분석을 요청했어요.");
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
            <Plus /> 추천곡 추가
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>추천곡 추가</DialogTitle>
              <DialogDescription>
                미리듣기 영상과 보컬·반주가 함께 있는 원곡 파일 하나를 등록해요. 음원 분석이 끝난 뒤 직접 공개하기
                전까지 추천에는 표시되지 않아요.
              </DialogDescription>
            </DialogHeader>
            <StatusNotice
              description="원곡 파일에서 보컬을 분리해 음역을 분석하고, 전체 원곡으로 원키를 추정해요. 같은 파일을 AI 믹싱의 기준 곡과 반주로 사용해요."
              icon={<FileAudio />}
              title="원곡 파일 하나만 필요해요"
            />
            <form action={add} className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-[11px] font-medium">
                곡 제목
                <input className={fieldClass} disabled={adding} name="title" required />
              </label>
              <label className="grid gap-1 text-[11px] font-medium">
                아티스트
                <input className={fieldClass} disabled={adding} name="artist" required />
              </label>
              <YouTubeUrlInput disabled={adding} />
              <AudioFileInput className="sm:col-span-2" disabled={adding} textClassName="text-[11px]" />
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
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">조건에 맞는 추천곡이 없어요.</div>
        )}
      </div>
    </div>
  );
}
