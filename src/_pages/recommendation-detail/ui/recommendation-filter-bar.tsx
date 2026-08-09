"use client";

import { RotateCcw, Search } from "lucide-react";
import type { RecommendationFilters } from "@/entities/recommendation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export function RecommendationFilterBar({
  filters,
  onChange,
  onReset,
  resultCount,
  totalCount,
}: {
  filters: RecommendationFilters;
  onChange: (patch: Partial<RecommendationFilters>) => void;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
}) {
  const changed = resultCount !== totalCount || filters.sort !== "rank";

  return (
    <section aria-label="추천 곡 검색과 필터" className="border-y py-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(15rem,1fr)_repeat(4,auto)_auto] xl:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="recommendation-search">곡 또는 아티스트 검색</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoComplete="off"
              className="pl-9"
              id="recommendation-search"
              onChange={(event) => onChange({ query: event.currentTarget.value.slice(0, 80) })}
              placeholder="곡명, 아티스트"
              type="search"
              value={filters.query}
            />
          </div>
        </div>
        <FilterSelect
          id="score-filter"
          label="적합도"
          onValueChange={(score) => onChange({ score: score as RecommendationFilters["score"] })}
          options={[
            ["all", "전체 적합도"],
            ["90-plus", "90% 이상"],
            ["80-plus", "80–89%"],
            ["under-80", "80% 미만"],
          ]}
          value={filters.score}
        />
        <FilterSelect
          id="shift-filter"
          label="추천 키"
          onValueChange={(shift) => onChange({ shift: shift as RecommendationFilters["shift"] })}
          options={[
            ["all", "모든 키 이동"],
            ["original", "원키"],
            ["lower", "키 낮춤"],
            ["higher", "키 높임"],
          ]}
          value={filters.shift}
        />
        <FilterSelect
          id="status-filter"
          label="믹싱 상태"
          onValueChange={(status) => onChange({ status: status as RecommendationFilters["status"] })}
          options={[
            ["all", "모든 믹싱 상태"],
            ["not-started", "시작 전"],
            ["active", "진행 중"],
            ["succeeded", "완료"],
            ["failed", "실패"],
          ]}
          value={filters.status}
        />
        <FilterSelect
          id="sort-filter"
          label="정렬"
          onValueChange={(sort) => onChange({ sort: sort as RecommendationFilters["sort"] })}
          options={[
            ["rank", "추천 순위"],
            ["adjusted-score", "추천 적합도 높은 순"],
            ["original-score", "원키 적합도 높은 순"],
            ["title", "곡명 가나다순"],
          ]}
          value={filters.sort}
        />
        <Button disabled={!changed} onClick={onReset} variant="ghost">
          <RotateCcw className="size-4" aria-hidden="true" /> 초기화
        </Button>
      </div>
      <p aria-live="polite" className="mt-3 text-xs text-muted-foreground">
        전체 {totalCount}곡 중 {resultCount}곡
      </p>
    </section>
  );
}

function FilterSelect({
  id,
  label,
  onValueChange,
  options,
  value,
}: {
  id: string;
  label: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
  value: string;
}) {
  const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1] ?? value;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select onValueChange={(nextValue) => nextValue && onValueChange(String(nextValue))} value={value}>
        <SelectTrigger className="h-10 w-full xl:w-auto" id={id}>
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
