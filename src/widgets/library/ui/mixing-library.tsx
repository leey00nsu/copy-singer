"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Music2, RotateCcw, Search } from "lucide-react";
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
} from "@/entities/mixing-job";
import { VocalProfileArtwork } from "@/entities/vocal-profile";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ResourceRowLink, resourceRowInteractiveClassName } from "@/shared/ui/resource-row-link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { StatePanel } from "@/shared/ui/state-panel";
import { StatusNotice } from "@/shared/ui/status-notice";
import { mixingHistoryHref } from "../model/search-params";
import { LibraryPagination } from "./library-pagination";

const STATUS_LABELS: Record<MixingHistoryFilterStatus, string> = {
  all: "모든 상태",
  ...MIXING_STATUS_LABELS,
  processing: "믹싱 중",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as Array<[MixingHistoryFilterStatus, string]>;

function MixingLibraryStatus({ job }: { job: MixingHistoryRow }) {
  if (job.status === "succeeded" && !job.resultReady) {
    return (
      <Badge className="h-7 gap-1.5 border border-data-accent/35 bg-data-accent/10 px-2.5 text-[11px] text-data-accent-foreground">
        <LoaderCircle aria-hidden="true" className="size-3 animate-spin motion-reduce:animate-none" />
        결과 확인 중
      </Badge>
    );
  }

  return <MixingStatusBadge label={STATUS_LABELS[job.status]} status={job.status} />;
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
      className="grid gap-3 py-4 lg:grid-cols-[minmax(15rem,1fr)_auto_auto] lg:items-end"
      action={basePath}
      method="get"
    >
      <input name="page" type="hidden" value="1" />
      {basePath === "/library" ? <input name="tab" type="hidden" value="mixes" /> : null}
      <input name="status" type="hidden" value={status} />
      <div className="grid gap-1.5">
        <Label className="text-[11px]" htmlFor={`${basePath.slice(1)}-mixing-search`}>
          작업, 아티스트 또는 보컬 프로필 검색
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
            placeholder="작업, 아티스트, 보컬 프로필"
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
            <th className="px-3 py-2 font-medium" scope="col">
              작업 / 아티스트
            </th>
            <th className="w-52 px-3 py-2 font-medium" scope="col">
              사용한 보컬 프로필
            </th>
            <th className="w-36 px-3 py-2 font-medium" scope="col">
              생성일
            </th>
            <th className="w-36 px-3 py-2 font-medium" scope="col">
              상태
            </th>
          </tr>
        </thead>
        <tbody className="block divide-y lg:table-row-group">
          {jobs.map((job) => {
            const active = isActiveMixingStatus(job.status);
            const detailHref = `/library/mixes/${job.id}`;
            return (
              <tr
                className={`${resourceRowInteractiveClassName} grid gap-2 px-3 py-3 lg:table-row lg:px-0 lg:py-0`}
                key={job.id}
              >
                <td
                  className="row-start-2 min-w-0 align-middle lg:table-cell lg:px-3 lg:py-3"
                  data-mixing-column="identity"
                >
                  <h2 className="truncate text-sm font-semibold">
                    <ResourceRowLink
                      aria-label={`${job.song.title} AI 믹스 상세 보기`}
                      className="underline-offset-4 group-hover/resource-row:underline"
                      href={detailHref}
                    >
                      {job.song.title}
                    </ResourceRowLink>
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.song.artist}</p>
                </td>
                <td
                  className="row-start-3 min-w-0 align-middle lg:table-cell lg:px-3 lg:py-3"
                  data-mixing-column="vocal-profile"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <VocalProfileArtwork
                      analysis={job.vocalProfile.artwork}
                      className="size-7 shrink-0"
                      profileId={job.vocalProfile.id}
                    />
                    <p className="min-w-0 truncate text-xs font-medium">
                      <span className="text-[10px] text-muted-foreground lg:hidden">보컬 · </span>
                      {job.vocalProfile.displayName}
                    </p>
                  </div>
                </td>
                <td
                  className="row-start-4 text-xs text-muted-foreground lg:table-cell lg:px-3 lg:py-3"
                  data-mixing-column="created-at"
                >
                  <span className="lg:hidden">생성 · </span>
                  {new Date(job.createdAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="row-start-1 align-middle lg:table-cell lg:px-3 lg:py-3" data-mixing-column="status">
                  <MixingLibraryStatus job={job} />
                  {active ? <span className="sr-only">자동 새로고침 중</span> : null}
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
        <StatusNotice
          className="mt-3"
          description="마지막으로 확인한 목록을 표시합니다."
          title="최신 작업 상태를 확인하지 못했어요"
          tone="destructive"
        />
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
