"use client";

import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { ADMIN_JOB_FILTERS, adminDate } from "../model/filters";

export type AdminMixingDetail = {
  id: string;
  status: string;
  errorCode: string | null;
  attempts: number;
  user: { name: string; email: string };
  song: { title: string; artist: string };
  createdAt: string;
  completedAt: string | null;
};

export function AdminMixingJobDetails({ job }: { job: AdminMixingDetail }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" variant="outline" aria-label={`${job.song.title} 작업 상세`} />}>
        상세
      </SheetTrigger>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="px-6 pt-7">
          <SheetTitle>믹싱 작업 상세</SheetTitle>
          <SheetDescription>
            {job.song.title} · {job.song.artist}
          </SheetDescription>
        </SheetHeader>
        <dl className="grid gap-5 px-6 pb-6 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">회원</dt>
            <dd className="mt-1 break-all">
              {job.user.name} · {job.user.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">상태</dt>
            <dd className="mt-1">{ADMIN_JOB_FILTERS.find(([key]) => key === job.status)?.[1] ?? job.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">시도</dt>
            <dd className="mt-1">{job.attempts}회</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">작업일</dt>
            <dd className="mt-1">{adminDate(new Date(job.createdAt))}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">완료일</dt>
            <dd className="mt-1">{adminDate(job.completedAt ? new Date(job.completedAt) : null)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">오류 코드</dt>
            <dd className="mt-1 break-all">{job.errorCode ?? "없음"}</dd>
          </div>
        </dl>
      </SheetContent>
    </Sheet>
  );
}
