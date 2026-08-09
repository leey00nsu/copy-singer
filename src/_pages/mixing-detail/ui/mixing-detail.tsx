"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Circle,
  CircleDot,
  Download,
  LoaderCircle,
  Music2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteMixingJobMutationOptions,
  type MixingHistoryRow,
  mixingDetailQueryOptions,
  mixingJobKeys,
  presentMixingJob,
} from "@/entities/mixing-job";
import { ApiError } from "@/shared/api";
import { cn } from "@/shared/lib/cn";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
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

function TimelineIcon({ state }: { state: "complete" | "reached" | "current" | "upcoming" | "skipped" }) {
  if (state === "complete") return <Check aria-hidden="true" className="size-4" />;
  if (state === "reached") return <CircleDot aria-hidden="true" className="size-4" />;
  if (state === "current")
    return <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />;
  return <Circle aria-hidden="true" className="size-3" />;
}

function MixingTimeline({ job }: { job: MixingHistoryRow }) {
  const presentation = presentMixingJob(job);
  return (
    <ol aria-label="AI 믹싱 진행 단계" className="grid border-y sm:grid-cols-4">
      {presentation.timeline.map((step, index) => (
        <li
          className={cn(
            "relative grid grid-cols-[auto_1fr] gap-3 px-4 py-5 sm:block sm:px-5",
            index > 0 && "border-t sm:border-t-0 sm:border-l",
            step.state === "skipped" && "text-muted-foreground",
          )}
          data-state={step.state}
          key={step.id}
        >
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full border",
              step.state === "complete" && "border-primary bg-primary text-primary-foreground",
              step.state === "reached" && "border-foreground text-foreground",
              step.state === "current" && "border-data-accent-foreground text-data-accent-foreground",
            )}
          >
            <TimelineIcon state={step.state} />
          </span>
          <div className="sm:mt-4">
            <p className="text-sm font-semibold">{step.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function MixingDeleteAction({ job }: { job: MixingHistoryRow }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deletion = useMutation(deleteMixingJobMutationOptions());

  const remove = () => {
    deletion.mutate(job.id, {
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({ queryKey: mixingJobKeys.histories() });
        queryClient.removeQueries({ queryKey: mixingJobKeys.detail(job.id) });
        toast.success(
          result.mediaCleanupPending
            ? "AI 믹스를 삭제했습니다. 결과 파일은 안전하게 정리 중입니다."
            : "AI 믹스를 삭제했습니다.",
        );
        router.push("/library?tab=mixes&page=1");
        router.refresh();
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === "MIXING_ACTIVE") {
          toast.error("진행 중인 믹싱은 완료된 뒤 삭제할 수 있습니다.");
          return;
        }
        toast.error("AI 믹스를 삭제하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
      },
    });
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button disabled={deletion.isPending} variant="ghost" />}>
        <Trash2 aria-hidden="true" className="size-4" /> 삭제
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>이 AI 믹스를 삭제할까요?</DialogTitle>
          <DialogDescription>
            저장된 믹싱 결과 파일은 정리되지만 티켓 사용 내역은 기록으로 유지됩니다. 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
          <Button disabled={deletion.isPending} onClick={remove} variant="destructive">
            {deletion.isPending ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Trash2 aria-hidden="true" className="size-4" />
            )}
            {deletion.isPending ? "삭제 중" : "AI 믹스 삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MixingDetail({ initial }: { initial: MixingHistoryRow }) {
  const detailQuery = useQuery(mixingDetailQueryOptions(initial.id, initial));
  const job = detailQuery.data ?? initial;
  const presentation = presentMixingJob(job);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/library?tab=mixes&page=1">
        <ArrowLeft aria-hidden="true" className="size-4" /> AI 믹스 목록
      </Link>

      <header className="mt-7 flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-data-accent-foreground">AI MIX DETAIL</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 text-3xl font-semibold tracking-tight sm:text-4xl">{job.song.title}</h1>
            <Badge
              variant={
                presentation.tone === "destructive"
                  ? "destructive"
                  : presentation.tone === "success"
                    ? "default"
                    : "secondary"
              }
            >
              {presentation.active ? (
                <LoaderCircle aria-hidden="true" className="size-3 animate-spin motion-reduce:animate-none" />
              ) : null}
              {presentation.label}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {job.song.artist} · TJ #{job.song.catalogOrder}
          </p>
          <p aria-live="polite" className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            {presentation.description}
          </p>
          {detailQuery.isError ? (
            <p className="mt-2 text-sm text-destructive" role="status">
              최신 상태를 확인하지 못해 마지막으로 확인한 정보를 표시합니다.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className={buttonVariants({ variant: "outline" })} href={`/vocal-profiles/${job.vocalProfile.id}`}>
            보컬 분석 보기
          </Link>
          {presentation.terminal ? <MixingDeleteAction job={job} /> : null}
        </div>
      </header>

      <dl className="mt-10 grid gap-px border-y bg-border sm:grid-cols-3">
        <div className="bg-background px-4 py-5 sm:px-6">
          <dt className="text-xs text-muted-foreground">사용 티켓</dt>
          <dd className="mt-1 text-lg font-semibold">{job.ticketCost}개</dd>
        </div>
        <div className="bg-background px-4 py-5 sm:px-6">
          <dt className="text-xs text-muted-foreground">요청 시간</dt>
          <dd className="mt-1 text-sm font-medium">{new Date(job.createdAt).toLocaleString("ko-KR")}</dd>
        </div>
        <div className="bg-background px-4 py-5 sm:px-6">
          <dt className="text-xs text-muted-foreground">최근 확인</dt>
          <dd className="mt-1 text-sm font-medium">{new Date(job.updatedAt).toLocaleString("ko-KR")}</dd>
        </div>
      </dl>

      <section aria-labelledby="mixing-progress-title" className="mt-10">
        <div className="mb-4">
          <h2 className="text-xl font-semibold" id="mixing-progress-title">
            믹싱 진행
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            서버에 저장된 상태와 시각만 표시하며 임의의 진행률은 계산하지 않습니다.
          </p>
        </div>
        <MixingTimeline job={job} />
      </section>

      {job.resultReady && job.audioUrl ? (
        <section aria-labelledby="mixing-result-title" className="mt-10 border-y py-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-data-accent-foreground">RESULT</p>
              <h2 className="mt-2 text-xl font-semibold" id="mixing-result-title">
                완성된 AI 믹스
              </h2>
            </div>
            <a className={buttonVariants()} download href={job.audioUrl}>
              <Download aria-hidden="true" className="size-4" /> 결과 저장
            </a>
          </div>
          <AudioWaveformPlayer
            className="mt-6"
            label={`${job.song.artist} ${job.song.title} AI 믹싱 결과`}
            src={job.audioUrl}
          />
        </section>
      ) : null}

      {job.status === "failed" || job.status === "canceled" ? (
        <section className="mt-10 border-y px-4 py-8 sm:px-6" aria-labelledby="mixing-next-action-title">
          <div className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border text-destructive">
              <TriangleAlert aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold" id="mixing-next-action-title">
                {job.status === "failed" ? "믹싱을 완료하지 못했어요." : "취소된 믹싱입니다."}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{presentation.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link className={buttonVariants()} href={`/vocal-profiles/${job.vocalProfile.id}`}>
                  <Music2 aria-hidden="true" className="size-4" /> 보컬 프로필에서 다시 시작
                </Link>
                <Link className={buttonVariants({ variant: "outline" })} href="/library?tab=mixes&page=1">
                  Library로 돌아가기
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
