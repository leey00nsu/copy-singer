"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  LoaderCircle,
  Music2,
  RotateCcw,
  Search,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  isActiveMixingStatus,
  MIXING_STATUS_LABELS,
  type MixingHistoryFilterStatus,
  type MixingHistoryFilters,
  type MixingHistoryPayload,
  type MixingHistoryRow,
  mixingHistoryFiltersSchema,
  mixingHistoryQueryOptions,
} from "@/entities/mixing-job";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { StatePanel } from "@/shared/ui/state-panel";
import { mixingHistoryHref } from "../model/search-params";
import { LibraryPagination } from "./library-pagination";

const STATUS_LABELS: Record<MixingHistoryFilterStatus, string> = {
  all: "모든 상태",
  ...MIXING_STATUS_LABELS,
  processing: "믹싱 중",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as Array<[MixingHistoryFilterStatus, string]>;

function statusIcon(job: MixingHistoryRow) {
  if (isActiveMixingStatus(job.status)) {
    return <LoaderCircle aria-hidden="true" className="size-3 animate-spin motion-reduce:animate-none" />;
  }
  if (job.status === "succeeded") return <CheckCircle2 aria-hidden="true" className="size-3" />;
  return <AlertTriangle aria-hidden="true" className="size-3" />;
}

function statusDescription(job: MixingHistoryRow) {
  if (job.resultReady) return "결과 준비 완료";
  if (job.status === "succeeded") return "결과 파일을 확인하고 있어요";
  if (job.status === "failed") return job.error?.detail ?? "믹싱 작업을 완료하지 못했어요.";
  if (job.status === "canceled") return "믹싱 작업이 취소됐어요.";
  return "페이지를 닫아도 서버에서 계속 진행됩니다.";
}

function MixingLibraryFilters({
  basePath,
  filters,
}: {
  basePath: "/library" | "/mixing-history";
  filters: MixingHistoryFilters;
}) {
  const [query, setQuery] = useState(filters.q);
  const [status, setStatus] = useState(filters.status);

  return (
    <form
      aria-label="AI 믹스 검색과 필터"
      className="grid gap-3 border-y py-4 lg:grid-cols-[minmax(15rem,1fr)_auto_auto] lg:items-end"
      action={basePath}
      method="get"
    >
      <input name="page" type="hidden" value="1" />
      {basePath === "/library" ? <input name="tab" type="hidden" value="mixes" /> : null}
      <input name="status" type="hidden" value={status} />
      <div className="grid gap-1.5">
        <Label htmlFor={`${basePath.slice(1)}-mixing-search`}>곡 또는 아티스트 검색</Label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            autoComplete="off"
            className="pl-9"
            id={`${basePath.slice(1)}-mixing-search`}
            maxLength={80}
            name="q"
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="곡명, 아티스트"
            type="search"
            value={query}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${basePath.slice(1)}-mixing-status`}>작업 상태</Label>
        <Select onValueChange={(value) => value && setStatus(value as MixingHistoryFilterStatus)} value={status}>
          <SelectTrigger className="h-10 w-full lg:w-44" id={`${basePath.slice(1)}-mixing-status`}>
            <SelectValue>{STATUS_LABELS[status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 lg:flex-none" type="submit">
          검색
        </Button>
        {filters.q || filters.status !== "all" ? (
          <Link
            className={buttonVariants({ variant: "ghost" })}
            href={mixingHistoryHref(basePath, { page: 1, q: "", status: "all" })}
          >
            <RotateCcw aria-hidden="true" className="size-4" /> 초기화
          </Link>
        ) : (
          <Button disabled type="button" variant="ghost">
            <RotateCcw aria-hidden="true" className="size-4" /> 초기화
          </Button>
        )}
      </div>
    </form>
  );
}

function MixingLibraryRows({ jobs }: { jobs: MixingHistoryRow[] }) {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  return (
    <div className="border-y">
      <table className="block w-full table-fixed border-collapse md:table">
        <caption className="sr-only">AI 믹스 작업 목록</caption>
        <thead className="hidden border-b bg-muted/20 text-left text-xs text-muted-foreground md:table-header-group">
          <tr>
            <th className="w-36 px-4 py-3 font-medium" scope="col">
              상태
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              곡
            </th>
            <th className="w-48 px-4 py-3 font-medium" scope="col">
              보컬 프로필
            </th>
            <th className="w-24 px-4 py-3 font-medium" scope="col">
              티켓
            </th>
            <th className="w-56 px-4 py-3 font-medium" scope="col">
              결과
            </th>
          </tr>
        </thead>
        <tbody className="block divide-y md:table-row-group">
          {jobs.map((job) => {
            const active = isActiveMixingStatus(job.status);
            const expanded = expandedJobId === job.id;
            return (
              <tr className="grid grid-cols-2 gap-4 py-5 md:table-row md:py-0" key={job.id}>
                <td className="col-span-2 px-4 align-top md:table-cell md:py-5">
                  <Badge variant={job.status === "failed" ? "destructive" : job.resultReady ? "default" : "secondary"}>
                    {statusIcon(job)}
                    {STATUS_LABELS[job.status]}
                  </Badge>
                  {active ? <span className="sr-only">자동 새로고침 중</span> : null}
                </td>
                <td className="col-span-2 min-w-0 px-4 align-top md:table-cell md:py-5">
                  <h2 className="truncate text-base font-semibold">
                    <Link className="underline-offset-4 hover:underline" href={`/library/mixes/${job.id}`}>
                      {job.song.title}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{job.song.artist}</p>
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">TJ #{job.song.catalogOrder}</p>
                </td>
                <td className="px-4 align-top md:table-cell md:py-5">
                  <p className="text-xs text-muted-foreground md:sr-only">보컬 프로필</p>
                  <Link
                    className="mt-1 inline-block text-sm font-medium underline-offset-4 hover:underline md:mt-0"
                    href={`/vocal-profiles/${job.vocalProfile.id}`}
                  >
                    분석 보기
                  </Link>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 aria-hidden="true" className="size-3" />
                    {new Date(job.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </td>
                <td className="px-4 align-top md:table-cell md:py-5">
                  <p className="text-xs text-muted-foreground md:sr-only">사용 티켓</p>
                  <p className="mt-1 flex items-center gap-1 text-sm font-medium md:mt-0">
                    <Ticket aria-hidden="true" className="size-3" /> {job.ticketCost}개
                  </p>
                </td>
                <td className="col-span-2 px-4 align-top md:table-cell md:py-5">
                  <p className="text-xs leading-5 text-muted-foreground">{statusDescription(job)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                      href={`/library/mixes/${job.id}`}
                    >
                      상세 보기
                    </Link>
                    {job.audioUrl ? (
                      <>
                        <Button onClick={() => setExpandedJobId(expanded ? null : job.id)} size="sm" variant="outline">
                          <Music2 aria-hidden="true" className="size-4" /> {expanded ? "플레이어 닫기" : "결과 듣기"}
                        </Button>
                        <a className={buttonVariants({ size: "sm", variant: "outline" })} download href={job.audioUrl}>
                          <Download aria-hidden="true" className="size-4" /> 결과 저장
                        </a>
                      </>
                    ) : null}
                  </div>
                  {expanded && job.audioUrl ? (
                    <div className="mt-4 min-w-0 rounded-lg bg-muted/40 p-3">
                      <AudioWaveformPlayer
                        label={`${job.song.artist} ${job.song.title} AI 믹싱 결과`}
                        src={job.audioUrl}
                      />
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MixingLibrary({
  basePath = "/mixing-history",
  filters: input,
  initial,
}: {
  basePath?: "/library" | "/mixing-history";
  filters?: Partial<MixingHistoryFilters>;
  initial: MixingHistoryPayload;
}) {
  const filters = mixingHistoryFiltersSchema.parse({ ...input, page: initial.page });
  const historyQuery = useQuery(mixingHistoryQueryOptions(initial, filters));
  const history = historyQuery.data;
  const filtered = Boolean(filters.q || filters.status !== "all");

  return (
    <section aria-label="AI 믹스 라이브러리">
      <MixingLibraryFilters
        basePath={basePath}
        filters={filters}
        key={`${basePath}:${filters.page}:${filters.q}:${filters.status}`}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p aria-live="polite">{filtered ? `검색 결과 ${history.total}개` : `저장된 AI 믹스 ${history.total}개`}</p>
        {history.jobs.some((job) => isActiveMixingStatus(job.status)) ? (
          <p>진행 중인 작업을 자동으로 확인하고 있어요.</p>
        ) : null}
      </div>
      {historyQuery.isError ? (
        <p className="mt-3 text-sm text-destructive" role="status">
          최신 작업 상태를 확인하지 못했어요. 마지막으로 확인한 목록을 표시합니다.
        </p>
      ) : null}
      <div className="mt-4">
        {history.jobs.length === 0 ? (
          <StatePanel
            action={
              filtered ? (
                <Link
                  className={buttonVariants({ variant: "outline" })}
                  href={mixingHistoryHref(basePath, { page: 1, q: "", status: "all" })}
                >
                  모든 AI 믹스 보기
                </Link>
              ) : (
                <Link className={buttonVariants()} href="/vocal-profiles">
                  추천할 프로필 고르기
                </Link>
              )
            }
            description={
              filtered
                ? "검색어나 작업 상태를 바꿔 다시 확인해보세요."
                : "추천 목록에서 원하는 곡의 AI 믹싱을 시작하면 작업과 결과가 여기에 저장됩니다."
            }
            icon={<Music2 />}
            title={filtered ? "조건에 맞는 AI 믹스가 없어요." : "아직 AI 믹스가 없어요."}
          />
        ) : (
          <MixingLibraryRows jobs={history.jobs} />
        )}
      </div>
      <LibraryPagination
        getHref={(page) => mixingHistoryHref(basePath, { ...filters, page })}
        label="AI 믹스 페이지"
        page={history.page}
        pageCount={history.pageCount}
      />
    </section>
  );
}
