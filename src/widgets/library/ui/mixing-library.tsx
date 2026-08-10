"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Music2, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  isActiveMixingStatus,
  MIXING_STATUS_LABELS,
  type MixingHistoryFilterStatus,
  type MixingHistoryFilters,
  type MixingHistoryPayload,
  type MixingHistoryRow,
  MixingStatusBadge,
  mixingHistoryFiltersSchema,
  mixingHistoryQueryOptions,
  presentMixingFailure,
} from "@/entities/mixing-job";
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
        <Label className="text-[11px]" htmlFor={`${basePath.slice(1)}-mixing-search`}>
          작업 또는 아티스트 검색
        </Label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            autoComplete="off"
            className="h-10 pl-9 text-sm"
            id={`${basePath.slice(1)}-mixing-search`}
            maxLength={80}
            name="q"
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="작업, 아티스트"
            type="search"
            value={query}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-[11px]" htmlFor={`${basePath.slice(1)}-mixing-status`}>
          작업 상태
        </Label>
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
        <Button className="h-10 flex-1 lg:flex-none" size="sm" type="submit">
          검색
        </Button>
        {filters.q || filters.status !== "all" ? (
          <Link
            className={`${buttonVariants({ size: "sm", variant: "ghost" })} h-10`}
            href={mixingHistoryHref(basePath, { page: 1, q: "", status: "all" })}
          >
            <RotateCcw aria-hidden="true" className="size-4" /> 초기화
          </Link>
        ) : (
          <Button className="h-10" disabled size="sm" type="button" variant="ghost">
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
      <table className="block w-full table-fixed border-collapse lg:table">
        <caption className="sr-only">AI 믹스 작업 목록</caption>
        <thead className="hidden border-b bg-muted/15 text-left text-[11px] text-muted-foreground lg:table-header-group">
          <tr>
            <th className="w-28 px-3 py-2 font-medium" scope="col">
              상태
            </th>
            <th className="px-3 py-2 font-medium" scope="col">
              작업 / 아티스트
            </th>
            <th className="w-36 px-3 py-2 font-medium" scope="col">
              생성일
            </th>
            <th className="w-48 px-3 py-2 font-medium" scope="col">
              결과
            </th>
            <th className="w-10 px-2 py-2" scope="col">
              <span className="sr-only">상세</span>
            </th>
          </tr>
        </thead>
        <tbody className="block divide-y lg:table-row-group">
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
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-3 py-3 lg:table-row lg:px-0 lg:py-0"
                key={job.id}
              >
                <td className="col-start-2 row-start-1 text-right align-middle lg:table-cell lg:px-3 lg:py-3 lg:text-left">
                  <MixingStatusBadge label={STATUS_LABELS[job.status]} status={job.status} />
                  {active ? <span className="sr-only">자동 새로고침 중</span> : null}
                </td>
                <td className="col-start-1 row-start-1 min-w-0 align-middle lg:table-cell lg:px-3 lg:py-3">
                  <h2 className="truncate text-sm font-semibold">
                    <Link className="underline-offset-4 hover:underline" href={detailHref}>
                      {job.song.title}
                    </Link>
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.song.artist}</p>
                </td>
                <td className="col-span-2 row-start-2 text-xs text-muted-foreground lg:table-cell lg:px-3 lg:py-3">
                  <span className="lg:hidden">생성 · </span>
                  {new Date(job.createdAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="col-span-2 row-start-3 align-middle lg:table-cell lg:px-3 lg:py-3">
                  <p className="text-xs leading-5 text-muted-foreground">{statusDescription(job)}</p>
                  <Link
                    className="mt-0.5 inline-flex text-xs font-semibold underline-offset-4 hover:underline"
                    href={detailHref}
                  >
                    {actionLabel}
                  </Link>
                </td>
                <td className="hidden align-middle lg:table-cell lg:px-2 lg:py-3 lg:text-right">
                  <Link
                    aria-label={`${job.song.title} 상세 보기`}
                    className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
                    href={detailHref}
                  >
                    <ChevronRight aria-hidden="true" className="size-3.5" />
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
