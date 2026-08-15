"use client";

import { ListFilter, RotateCcw, Search } from "lucide-react";
import type { RecommendationFilters } from "@/entities/recommendation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";

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
  const changed =
    Boolean(filters.query) ||
    filters.score !== "all" ||
    filters.shift !== "all" ||
    filters.status !== "all" ||
    filters.sort !== "recommendation-score";
  const activeFilterCount = [filters.score !== "all", filters.shift !== "all", filters.status !== "all"].filter(
    Boolean,
  ).length;

  return (
    <section aria-label="추천 곡 검색과 필터">
      <div className="grid gap-3 xl:hidden">
        <div className="grid gap-1.5">
          <Label htmlFor="recommendation-search-mobile">곡 또는 아티스트 검색</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoComplete="off"
              className="pl-9"
              id="recommendation-search-mobile"
              onChange={(event) => onChange({ query: event.currentTarget.value.slice(0, 80) })}
              placeholder="곡명, 아티스트"
              type="search"
              value={filters.query}
            />
          </div>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-2">
          <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>
              <ListFilter aria-hidden="true" className="size-4" />
              필터{activeFilterCount > 0 ? ` ${activeFilterCount}` : ""}
            </SheetTrigger>
            <SheetContent aria-label="추천곡 상세 필터" side="bottom">
              <SheetHeader>
                <SheetTitle>추천곡 필터</SheetTitle>
                <SheetDescription>적합도, 추천 키와 실제 믹싱 상태를 기준으로 좁혀보세요.</SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 border-y px-4 py-5 sm:grid-cols-3">
                <ScoreFilter filters={filters} idSuffix="mobile" onChange={onChange} />
                <ShiftFilter filters={filters} idSuffix="mobile" onChange={onChange} />
                <StatusFilter filters={filters} idSuffix="mobile" onChange={onChange} />
              </div>
              <SheetFooter className="grid grid-cols-2">
                <Button disabled={!changed} onClick={onReset} variant="outline">
                  <RotateCcw aria-hidden="true" className="size-4" /> 초기화
                </Button>
                <SheetClose render={<Button />}>{resultCount}곡 보기</SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <FilterSelect
            id="sort-filter-mobile"
            label="정렬"
            onValueChange={(sort) => onChange({ sort: sort as RecommendationFilters["sort"] })}
            options={sortOptions}
            value={filters.sort}
          />
          <Button aria-label="추천 조건 초기화" disabled={!changed} onClick={onReset} size="icon" variant="ghost">
            <RotateCcw aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      <div className="hidden gap-3 xl:grid xl:grid-cols-[minmax(15rem,1fr)_repeat(4,auto)_auto] xl:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="recommendation-search-desktop">곡 또는 아티스트 검색</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoComplete="off"
              className="pl-9"
              id="recommendation-search-desktop"
              onChange={(event) => onChange({ query: event.currentTarget.value.slice(0, 80) })}
              placeholder="곡명, 아티스트"
              type="search"
              value={filters.query}
            />
          </div>
        </div>
        <ScoreFilter filters={filters} idSuffix="desktop" onChange={onChange} />
        <ShiftFilter filters={filters} idSuffix="desktop" onChange={onChange} />
        <StatusFilter filters={filters} idSuffix="desktop" onChange={onChange} />
        <FilterSelect
          id="sort-filter-desktop"
          label="정렬"
          onValueChange={(sort) => onChange({ sort: sort as RecommendationFilters["sort"] })}
          options={sortOptions}
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

const scoreOptions = [
  ["all", "전체 추천 점수"],
  ["90-plus", "90% 이상"],
  ["80-plus", "80–89%"],
  ["under-80", "80% 미만"],
] as const;

const shiftOptions = [
  ["all", "모든 키 이동"],
  ["original", "원키"],
  ["lower", "키 낮춤"],
  ["higher", "키 높임"],
] as const;

const statusOptions = [
  ["all", "모든 믹싱 상태"],
  ["not-started", "시작 전"],
  ["active", "진행 중"],
  ["succeeded", "완료"],
  ["failed", "실패"],
] as const;

const sortOptions = [
  ["recommendation-score", "추천 점수 높은 순"],
  ["original-score", "원키 적합도 높은 순"],
  ["title", "곡명 가나다순"],
] as const;

function ScoreFilter({ filters, idSuffix, onChange }: FilterGroupProps) {
  return (
    <FilterSelect
      id={`score-filter-${idSuffix}`}
      label="적합도"
      onValueChange={(score) => onChange({ score: score as RecommendationFilters["score"] })}
      options={scoreOptions}
      value={filters.score}
    />
  );
}

function ShiftFilter({ filters, idSuffix, onChange }: FilterGroupProps) {
  return (
    <FilterSelect
      id={`shift-filter-${idSuffix}`}
      label="추천 키"
      onValueChange={(shift) => onChange({ shift: shift as RecommendationFilters["shift"] })}
      options={shiftOptions}
      value={filters.shift}
    />
  );
}

function StatusFilter({ filters, idSuffix, onChange }: FilterGroupProps) {
  return (
    <FilterSelect
      id={`status-filter-${idSuffix}`}
      label="믹싱 상태"
      onValueChange={(status) => onChange({ status: status as RecommendationFilters["status"] })}
      options={statusOptions}
      value={filters.status}
    />
  );
}

type FilterGroupProps = {
  filters: RecommendationFilters;
  idSuffix: "desktop" | "mobile";
  onChange: (patch: Partial<RecommendationFilters>) => void;
};

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
