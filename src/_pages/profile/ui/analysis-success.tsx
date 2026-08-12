import { LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import type { VocalProfileResponse } from "@/entities/vocal-profile";
import { VocalProfileSummary } from "@/entities/vocal-profile";
import { Button, buttonVariants } from "@/shared/ui/button";
import { StatusNotice } from "@/shared/ui/status-notice";
import { ProcessHero } from "@/widgets/creation-funnel";

export function AnalysisSuccess({
  creatingRecommendation,
  onContinue,
  onReset,
  profile,
  profileId,
}: {
  creatingRecommendation: boolean;
  onContinue: () => void;
  onReset: () => void;
  profile?: VocalProfileResponse | null;
  profileId: string;
}) {
  return (
    <ProcessHero
      action={
        <>
          <Button disabled={creatingRecommendation} onClick={onContinue}>
            {creatingRecommendation ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Sparkles aria-hidden="true" className="size-4" />
            )}
            {creatingRecommendation ? "노래를 찾는 중" : "내 목소리에 맞는 노래 찾기"}
          </Button>
          <Link className={buttonVariants({ variant: "outline" })} href={`/vocal-profiles/${profileId}`}>
            전체 분석 보기
          </Link>
          <Button onClick={onReset} variant="ghost">
            새 목소리 분석
          </Button>
        </>
      }
      description="핵심 결과를 저장했습니다. 전체 차트는 상세 분석에서 언제든 다시 확인할 수 있어요."
      eyebrow="Voice analysis"
      title="목소리 분석을 완료했어요"
      tone="success"
    >
      {profile ? (
        <VocalProfileSummary profile={profile} />
      ) : (
        <StatusNotice description="저장된 보컬 프로필에서 전체 분석 결과를 확인할 수 있습니다." />
      )}
    </ProcessHero>
  );
}
