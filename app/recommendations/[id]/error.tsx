"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/button";

export default function RecommendationErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto size-9 text-destructive" />
        <h1 className="mt-4 text-2xl font-semibold">추천 결과를 불러오지 못했어요.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          PostgreSQL 연결과 카탈로그 상태를 확인한 뒤 다시 시도해주세요.
        </p>
        <Button className="mt-6" onClick={reset}>
          <RotateCcw className="size-4" /> 다시 시도
        </Button>
      </div>
    </main>
  );
}
