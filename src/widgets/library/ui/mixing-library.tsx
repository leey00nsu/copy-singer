"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, Music2, RotateCcw, Search, Ticket } from "lucide-react";
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
  presentMixingFailure,
} from "@/entities/mixing-job";
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
  if (job.status === "failed") return presentMixingFailure(job.error);
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
  return (
    <div className="border-y">
      <table className="block w-full table-fixed border-collapse xl:table">
        <caption className="sr-only">AI 믹스 작업 목록</caption>
        <thead className="hidden border-b bg-muted/20 text-left text-xs text-muted-foreground xl:table-header-group">
          <tr>
            <th className="w-32 px-4 py-2.5 font-medium" scope="col">
              상태
            </th>
            <th className="px-4 py-2.5 font-medium" scope="col">
              곡
            </th>
            <th className="w-52 px-4 py-2.5 font-medium" scope="col">
              작업 정보
            </th>
            <th className="w-72 px-4 py-2.5 font-medium" scope="col">
              결과
            </th>
          </tr>
        </thead>
        <tbody className="block divide-y xl:table-row-group">
          {jobs.map((job) => {
            const active = isActiveMixingStatus(job.status);
            const detailHref = `/library/mixes/${job.id}`;
            const actionLabel = job.resultReady
              ? "결과 듣기"
              : active
                ? "진행 확인"
                : job.status === "failed"
                  ? "다시 시도"
                  : "상세 보기";
            return (
              <tr
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 py-4 xl:table-row xl:py-0"
                key={job.id}
              >
                <td className="col-start-2 row-start-1 px-4 text-right align-middle xl:table-cell xl:py-4 xl:text-left">
                  <Badge variant={job.status === "failed" ? "destructive" : job.resultReady ? "default" : "secondary"}>
                    {statusIcon(job)}
                    {STATUS_LABELS[job.status]}
                  </Badge>
                  {active ? <span className="sr-only">자동 새로고침 중</span> : null}
                </td>
                <td className="col-start-1 row-start-1 min-w-0 pr-0 pl-4 align-middle xl:table-cell xl:px-4 xl:py-4">
                  <h2 className="truncate text-sm font-semibold">
                    <Link className="underline-offset-4 hover:underline" href={detailHref}>
                      {job.song.title}
                    </Link>
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.song.artist}</p>
                </td>
                <td className="col-span-2 row-start-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-4 align-middle text-xs text-muted-foreground xl:table-cell xl:py-4">
                  <Link
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    href={`/vocal-profiles/${job.vocalProfile.id}`}
                  >
                    보컬 분석
                  </Link>
                  <span className="inline-flex items-center gap-1 xl:mt-1 xl:flex">
                    <Clock3 aria-hidden="true" className="size-3" />
                    {new Date(job.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                  <span className="inline-flex items-center gap-1 xl:mt-1 xl:flex">
                    <Ticket aria-hidden="true" className="size-3" /> 티켓 {job.ticketCost}개
                  </span>
                </td>
                <td className="col-span-2 row-start-3 flex items-center justify-between gap-3 px-4 align-middle xl:table-cell xl:py-4">
                  <p className="min-w-0 text-xs leading-5 text-muted-foreground xl:line-clamp-2">
                    {statusDescription(job)}
                  </p>
                  <Link
                    className={buttonVariants({ size: "sm", variant: job.resultReady ? "outline" : "ghost" })}
                    href={detailHref}
                  >
                    {actionLabel}
                  </Link>
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
