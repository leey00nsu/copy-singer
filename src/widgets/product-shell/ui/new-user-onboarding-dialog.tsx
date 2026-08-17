"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRight, AudioLines, Mic2, Music2, Sparkles } from "lucide-react";
import { useState } from "react";
import { type TicketWallet, ticketBalanceForKind } from "@/entities/ticket";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { completeOnboardingMutationOptions } from "../api/onboarding-client";

type NewUserOnboardingDialogProps = {
  wallets: TicketWallet[];
};

const journey = [
  { icon: Mic2, label: "목소리 분석" },
  { icon: Music2, label: "노래 추천" },
  { icon: AudioLines, label: "AI 믹싱" },
] as const;

function NewUserOnboardingDialog({ wallets }: NewUserOnboardingDialogProps) {
  const [open, setOpen] = useState(true);
  const completion = useMutation({
    ...completeOnboardingMutationOptions(),
    onSuccess: () => setOpen(false),
  });
  const analysisBalance = ticketBalanceForKind(wallets, "VOCAL_ANALYSIS");
  const mixingBalance = ticketBalanceForKind(wallets, "AI_MIXING");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setOpen(true);
      }}
    >
      <DialogContent className="gap-5 p-5 sm:max-w-lg sm:p-6" showCloseButton={false}>
        <DialogHeader className="pr-1">
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/8 text-primary">
            <Sparkles aria-hidden="true" className="size-5" />
          </div>
          <DialogTitle className="text-xl leading-tight">처음 만나는 Copysinger</DialogTitle>
          <DialogDescription className="max-w-md leading-6">
            내 목소리를 분석하고, 잘 맞는 노래를 찾아 AI 믹싱까지 만들어요.
          </DialogDescription>
        </DialogHeader>

        <ol aria-label="Copysinger 이용 흐름" className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1">
          {journey.map(({ icon: Icon, label }, index) => (
            <li className="contents" key={label}>
              <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                <span className="flex size-9 items-center justify-center rounded-full border border-border bg-muted/40">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="text-[11px] font-medium leading-tight sm:text-xs">{label}</span>
              </div>
              {index < journey.length - 1 ? (
                <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
              ) : null}
            </li>
          ))}
        </ol>

        <div className="grid gap-2.5">
          <TicketIntroduction
            balance={analysisBalance}
            description="목소리를 분석해 보컬 프로필을 만들 때 사용해요."
            label="분석 티켓"
          />
          <TicketIntroduction
            balance={mixingBalance}
            description="추천 곡으로 AI 믹싱을 시작할 때 사용해요."
            label="믹싱 티켓"
          />
        </div>

        {completion.isError ? (
          <p className="text-sm text-destructive" role="alert">
            완료 상태를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        ) : null}

        <DialogFooter className="-mx-5 -mb-5 p-5 sm:-mx-6 sm:-mb-6 sm:p-6">
          <Button
            className="w-full sm:w-auto sm:min-w-28"
            disabled={completion.isPending}
            onClick={() => completion.mutate()}
          >
            {completion.isPending ? "저장 중…" : completion.isError ? "다시 시도" : "시작하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketIntroduction({ balance, description, label }: { balance: number; description: string; label: string }) {
  return (
    <section className="rounded-xl border border-border/80 bg-muted/25 p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-heading text-sm font-medium">{label}</h3>
        <p className="shrink-0 text-sm font-semibold">현재 {balance}장</p>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </section>
  );
}

export { NewUserOnboardingDialog };
