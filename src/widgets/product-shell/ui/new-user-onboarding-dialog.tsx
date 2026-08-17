"use client";

import { useMutation } from "@tanstack/react-query";
import { AudioLines, Mic2, Music2 } from "lucide-react";
import { useState } from "react";
import { type TicketWallet, ticketBalanceForKind } from "@/entities/ticket";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { FunnelStepper } from "@/shared/ui/funnel-stepper";
import { completeOnboardingMutationOptions } from "../api/onboarding-client";
import { ProductMark } from "./product-mark";

type NewUserOnboardingDialogProps = {
  wallets: TicketWallet[];
};

const onboardingSteps = [
  { id: "analysis", label: "목소리 분석" },
  { id: "recommendation", label: "노래 추천" },
  { id: "mixing", label: "AI 믹싱" },
] as const;

type OnboardingStep = (typeof onboardingSteps)[number]["id"];

const onboardingStepContent = {
  analysis: {
    description: "한 소절을 녹음하거나 파일을 올리면 음역과 보컬 특성을 분석해 보컬 프로필을 만들어요.",
    eyebrow: "Voice analysis",
    icon: Mic2,
    title: "내 목소리의 기준을 만들어요",
  },
  recommendation: {
    description: "저장된 보컬 프로필을 기준으로 잘 맞는 노래와 추천 키를 찾아 순서대로 보여줘요.",
    eyebrow: "Song recommendation",
    icon: Music2,
    title: "어울리는 노래와 키를 찾아요",
  },
  mixing: {
    description: "추천 곡을 선택하면 내 보컬 프로필을 사용한 AI 믹싱을 만들고 결과를 보관할 수 있어요.",
    eyebrow: "AI mixing",
    icon: AudioLines,
    title: "추천 곡을 내 목소리로 들어봐요",
  },
} as const satisfies Record<OnboardingStep, { description: string; eyebrow: string; icon: typeof Mic2; title: string }>;

function NewUserOnboardingDialog({ wallets }: NewUserOnboardingDialogProps) {
  const [open, setOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("analysis");
  const completion = useMutation({
    ...completeOnboardingMutationOptions(),
    onSuccess: () => setOpen(false),
  });
  const currentIndex = onboardingSteps.findIndex((step) => step.id === currentStep);
  const content = onboardingStepContent[currentStep];
  const CurrentIcon = content.icon;
  const analysisBalance = ticketBalanceForKind(wallets, "VOCAL_ANALYSIS");
  const mixingBalance = ticketBalanceForKind(wallets, "AI_MIXING");
  const finalStep = currentStep === "mixing";

  function moveTo(index: number) {
    const step = onboardingSteps[index];
    if (!step) return;
    completion.reset();
    setCurrentStep(step.id);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setOpen(true);
      }}
    >
      <DialogContent className="gap-5 p-5 sm:max-w-lg sm:p-6" showCloseButton={false}>
        <DialogHeader className="pr-1">
          <div className="flex items-start gap-3">
            <ProductMark className="mt-0.5 size-9 shrink-0" />
            <div className="min-w-0">
              <DialogTitle className="text-xl leading-tight">처음 만나는 Copysinger</DialogTitle>
              <DialogDescription className="mt-2 max-w-md leading-6">
                내 목소리를 분석하고, 잘 맞는 노래를 찾아 AI 믹싱까지 만들어요.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-xl border border-border/80 bg-muted/20 px-2.5 py-4 sm:px-4">
          <FunnelStepper ariaLabel="온보딩 진행 단계" current={currentStep} steps={onboardingSteps} />
        </div>

        <section aria-labelledby={`onboarding-${currentStep}-title`} className="min-h-52 rounded-xl border p-4 sm:p-5">
          <span className="flex size-10 items-center justify-center rounded-full border border-data-accent/25 bg-data-accent/10 text-data-accent-foreground">
            <CurrentIcon aria-hidden="true" className="size-5" />
          </span>
          <p className="mt-4 text-[10px] font-semibold tracking-[0.14em] text-data-accent-foreground uppercase">
            {content.eyebrow}
          </p>
          <h3
            className="mt-1.5 font-heading text-lg font-semibold tracking-[-0.025em]"
            id={`onboarding-${currentStep}-title`}
          >
            {content.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{content.description}</p>

          {currentStep === "analysis" ? (
            <TicketIntroduction
              balance={analysisBalance}
              description="새 보컬 프로필을 만들 때 사용해요."
              label="분석 티켓"
            />
          ) : null}
          {currentStep === "recommendation" ? (
            <p className="mt-4 rounded-lg bg-muted/45 px-3.5 py-3 text-xs leading-5 text-muted-foreground">
              노래 추천에는 티켓을 사용하지 않아요. 먼저 보컬 프로필을 선택하면 돼요.
            </p>
          ) : null}
          {currentStep === "mixing" ? (
            <TicketIntroduction
              balance={mixingBalance}
              description="추천 곡으로 새 AI 믹싱을 시작할 때 사용해요."
              label="믹싱 티켓"
            />
          ) : null}
        </section>

        {finalStep && completion.isError ? (
          <p className="text-sm text-destructive" role="alert">
            완료 상태를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        ) : null}

        <DialogFooter className="-mx-5 -mb-5 p-5 sm:-mx-6 sm:-mb-6 sm:items-center sm:p-6">
          {currentIndex > 0 ? (
            <Button
              className="w-full sm:w-auto sm:min-w-24"
              disabled={completion.isPending}
              onClick={() => moveTo(currentIndex - 1)}
              variant="outline"
            >
              이전
            </Button>
          ) : null}
          <Button
            className="w-full sm:w-auto sm:min-w-28"
            disabled={completion.isPending}
            onClick={() => (finalStep ? completion.mutate() : moveTo(currentIndex + 1))}
          >
            {finalStep ? (completion.isPending ? "저장 중…" : completion.isError ? "다시 시도" : "시작하기") : "다음"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketIntroduction({ balance, description, label }: { balance: number; description: string; label: string }) {
  return (
    <div className="mt-4 rounded-lg border border-data-accent/20 bg-data-accent/5 px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-heading text-sm font-medium">{label}</p>
        <p className="shrink-0 text-sm font-semibold text-data-accent-foreground">현재 {balance}장</p>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

export { NewUserOnboardingDialog };
