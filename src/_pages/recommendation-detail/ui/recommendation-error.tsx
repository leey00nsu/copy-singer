"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { StatePanel } from "@/shared/ui/state-panel";

export default function RecommendationErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[70vh] items-center px-5 py-12 sm:px-8">
      <StatePanel
        action={
          <Button onClick={reset}>
            <RotateCcw aria-hidden="true" className="size-4" /> 다시 시도
          </Button>
        }
        className="mx-auto w-full max-w-3xl"
        description="잠시 뒤 다시 시도해 주세요."
        headingLevel="h1"
        icon={<AlertTriangle />}
        role="alert"
        title="추천 결과를 불러오지 못했어요."
        tone="destructive"
      />
    </main>
  );
}
