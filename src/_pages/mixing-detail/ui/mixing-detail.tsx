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
  MixingStatusBadge,
  mixingDetailQueryOptions,
  mixingJobKeys,
  presentMixingJob,
} from "@/entities/mixing-job";
import { VocalProfileArtwork } from "@/entities/vocal-profile";
import { ApiError } from "@/shared/api";
import { cn } from "@/shared/lib/cn";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
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
import { ProductPageIntro } from "@/shared/ui/product-page-intro";
import { StatusNotice } from "@/shared/ui/status-notice";
import { ActualStateTimeline, CreationFunnelShell, ProcessHero } from "@/widgets/creation-funnel";

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
    <ol aria-label="AI 믹싱 진행 단계" className="grid overflow-hidden rounded-xl bg-muted/25 sm:grid-cols-4">
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

function ActiveMixingProgress({ job }: { job: MixingHistoryRow }) {
  const presentation = presentMixingJob(job);

  return (
    <ProcessHero
      description={
        <>
          <span className="block text-foreground">
            {job.song.title} · {job.song.artist}
          </span>
          <Link
            className="mt-2 inline-flex items-center gap-2 font-medium text-foreground underline-offset-4 hover:underline"
            href={`/vocal-profiles/${job.vocalProfile.id}`}
          >
            사용한 보컬 · {job.vocalProfile.displayName}
          </Link>
          <span className="mt-1 block">잠시만 기다려주세요.</span>
        </>
      }
      eyebrow="AI mixing"
      status={<MixingStatusBadge className="h-8 px-3" status={job.status} />}
      title={
        <>
          AI가 당신의 목소리를 분석하고
          <br className="hidden sm:block" /> 최적의 사운드로 믹싱하고 있어요
        </>
      }
    >
      <ActualStateTimeline label="AI 믹싱 진행 단계" steps={presentation.timeline} />
      <p className="mx-auto mt-5 max-w-md text-xs leading-5 text-muted-foreground">
        서버가 제공하는 실제 단계만 표시하며 임의의 진행률은 계산하지 않습니다. 이 페이지를 닫아도 작업은 서버에서 계속
        진행되고, 완료되면 AI 믹스 라이브러리에서 결과를 확인할 수 있어요.
      </p>
    </ProcessHero>
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

  if (presentation.active) {
    return (
      <CreationFunnelShell
        backAction={
          <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/library?tab=mixes&page=1">
            <ArrowLeft aria-hidden="true" className="size-4" /> AI 믹스 목록
          </Link>
        }
        currentStep="mixing"
      >
        <ActiveMixingProgress job={job} />
      </CreationFunnelShell>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[72rem] px-5 py-10 sm:px-7 lg:px-8 lg:py-12">
      <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/library?tab=mixes&page=1">
        <ArrowLeft aria-hidden="true" className="size-4" /> AI 믹스 목록
      </Link>

      <ProductPageIntro
        aside={
          <div className="flex flex-wrap gap-2">{presentation.terminal ? <MixingDeleteAction job={job} /> : null}</div>
        }
        className="mt-9 pb-10"
        description={presentation.description}
        eyebrow="AI mix detail"
        meta={<MixingStatusBadge status={job.status} />}
        title={job.song.title}
        variant="detail"
      >
        <p className="mt-3 text-sm text-muted-foreground">{job.song.artist}</p>
        <Link
          aria-label={`사용한 보컬 프로필 ${job.vocalProfile.displayName} 보기`}
          className="mt-5 inline-flex min-w-0 items-center gap-3 rounded-lg border p-2 pr-4 transition-colors hover:bg-muted/35"
          href={`/vocal-profiles/${job.vocalProfile.id}`}
        >
          <VocalProfileArtwork className="size-9 shrink-0" profileId={job.vocalProfile.id} />
          <span className="min-w-0 text-left">
            <span className="block text-[10px] text-muted-foreground">사용한 보컬 프로필</span>
            <strong className="block truncate text-sm font-semibold">{job.vocalProfile.displayName}</strong>
          </span>
        </Link>
        {detailQuery.isError ? (
          <StatusNotice
            className="mt-4 max-w-xl"
            description="마지막으로 확인한 정보를 표시합니다."
            title="최신 상태를 확인하지 못했어요"
            tone="destructive"
          />
        ) : null}
      </ProductPageIntro>

      {job.resultReady && job.audioUrl ? (
        <section aria-labelledby="mixing-result-title" className="py-8 sm:py-10 lg:py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">
                Result
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight" id="mixing-result-title">
                완성된 AI 믹스
              </h2>
            </div>
            <a className={buttonVariants()} download href={job.audioUrl}>
              <Download aria-hidden="true" className="size-4" /> 결과 저장
            </a>
          </div>
          <AudioWaveformPlayer
            className="mt-7"
            label={`${job.song.artist} ${job.song.title} AI 믹싱 결과`}
            src={job.audioUrl}
          />
        </section>
      ) : null}

      <dl className="grid gap-px border-y bg-border sm:grid-cols-3">
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

      <section aria-labelledby="mixing-progress-title" className="py-8 sm:py-10 lg:py-12">
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

      {job.status === "failed" || job.status === "canceled" ? (
        <section className="py-8 sm:py-10 lg:py-12" aria-labelledby="mixing-next-action-title">
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
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
