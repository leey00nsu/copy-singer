"use client";

import { useMutation } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { type TicketKind, ticketBalanceForKind, ticketKindLabel } from "@/entities/ticket/index.model";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { adjustTicketsMutationOptions } from "../api/client";
import type { TicketAdjustmentRequest } from "../model/contract";
import type { TicketAdjustmentUser } from "./ticket-adjustment-form";

const fieldClass = "h-10 w-full rounded-lg border bg-background px-3 text-sm";

export function TicketAdjustmentSheet({ user }: { user: TicketAdjustmentUser }) {
  const router = useRouter();
  const mutation = useMutation(adjustTicketsMutationOptions());
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [kind, setKind] = useState<TicketKind>("VOCAL_ANALYSIS");
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [request, setRequest] = useState<TicketAdjustmentRequest | null>(null);
  const balance = ticketBalanceForKind(user.ticketWallets, kind);
  const delta = Number(amount);

  function changeOpen(next: boolean) {
    if (mutation.isPending) return;
    setOpen(next);
    if (next) {
      setConfirming(false);
      setKind("VOCAL_ANALYSIS");
      setAmount("1");
      setReason("");
      setError("");
      setRequest(null);
    }
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 10_000 || balance + delta < 0) {
      setError("잔액이 음수가 되지 않도록 0이 아닌 정수 조정량을 입력해 주세요.");
      return;
    }
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3 || normalizedReason.length > 500) {
      setError("조정 사유를 3~500자로 입력해 주세요.");
      return;
    }
    setError("");
    if (!request || request.kind !== kind || request.amount !== delta || request.reason !== normalizedReason) {
      setRequest({
        userId: user.id,
        kind,
        amount: delta,
        reason: normalizedReason,
        idempotencyKey: crypto.randomUUID(),
      });
    }
    setConfirming(true);
  }

  async function apply() {
    if (!request || mutation.isPending) return;
    setError("");
    try {
      const result = await mutation.mutateAsync(request);
      toast.success(`${ticketKindLabel(result.kind)}을 조정했어요. 새 잔액 ${result.balanceAfter}장`);
      setOpen(false);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "티켓을 조정하지 못했어요.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" aria-label={`${user.name} 티켓 조정`} />}>
        티켓 조정
      </SheetTrigger>
      <SheetContent
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        showCloseButton={!mutation.isPending}
      >
        <SheetHeader className="px-6 pt-7">
          <SheetTitle>{confirming ? "티켓 조정 확인" : "티켓 조정"}</SheetTitle>
          <SheetDescription>선택한 회원의 티켓을 조정합니다.</SheetDescription>
        </SheetHeader>
        <div className="mx-6 rounded-xl bg-muted/40 p-4">
          <p className="font-medium">{user.name}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p>
        </div>
        {confirming && request ? (
          <div className="flex flex-1 flex-col px-6 pb-6">
            <dl className="grid gap-5 py-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">티켓 종류</dt>
                <dd className="mt-1">{ticketKindLabel(request.kind)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">잔액 변경</dt>
                <dd className="mt-1 tabular-nums">
                  {ticketBalanceForKind(user.ticketWallets, request.kind)} →{" "}
                  {ticketBalanceForKind(user.ticketWallets, request.kind) + request.amount}장 (
                  {request.amount > 0 ? "+" : ""}
                  {request.amount})
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">사유</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words">{request.reason}</dd>
              </div>
            </dl>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="mt-auto flex gap-2 pt-8">
              <Button variant="outline" disabled={mutation.isPending} onClick={() => setConfirming(false)}>
                수정
              </Button>
              <Button className="flex-1" disabled={mutation.isPending} onClick={apply}>
                {mutation.isPending ? <LoaderCircle className="animate-spin" /> : null}
                {mutation.isPending ? "적용 중" : "적용"}
              </Button>
            </div>
          </div>
        ) : (
          <form className="flex flex-1 flex-col gap-5 px-6 pb-6" onSubmit={review}>
            <label className="grid gap-2 text-sm font-medium">
              티켓 종류
              <select
                className={fieldClass}
                value={kind}
                onChange={(event) => setKind(event.target.value as TicketKind)}
              >
                <option value="VOCAL_ANALYSIS">분석 티켓</option>
                <option value="AI_MIXING">믹싱 티켓</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              조정량
              <input
                className={fieldClass}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                min={-10_000}
                max={10_000}
                step={1}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              사유
              <textarea
                className="min-h-24 resize-y rounded-lg border bg-background p-3 text-sm"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={3}
                maxLength={500}
                placeholder="고객 지원 지급 등"
                required
              />
            </label>
            <p className="flex justify-between text-sm">
              <span className="text-muted-foreground">예상 잔액</span>
              <span className="tabular-nums">
                {balance} → {Number.isFinite(delta) ? balance + delta : "—"}장
              </span>
            </p>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button className="mt-auto" type="submit">
              조정 내용 확인
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
