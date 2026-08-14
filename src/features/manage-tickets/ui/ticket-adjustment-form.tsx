"use client";

import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { adjustTicketsMutationOptions } from "../api/client";

export function TicketAdjustmentForm({
  users,
}: {
  users: Array<{ id: string; name: string; email: string; ticketBalance: number }>;
}) {
  const router = useRouter();
  const adjustmentMutation = useMutation(adjustTicketsMutationOptions());

  async function submit(formData: FormData) {
    try {
      const payload = await adjustmentMutation.mutateAsync({
        userId: String(formData.get("userId") ?? ""),
        amount: Number(formData.get("amount")),
        reason: String(formData.get("reason") ?? ""),
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(`티켓을 조정했어요. 새 잔액 ${payload.balanceAfter}개`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "티켓을 조정하지 못했어요.");
    }
  }

  return (
    <form
      action={submit}
      className="grid min-w-0 gap-3 lg:grid-cols-[minmax(220px,1fr)_140px_minmax(260px,1.4fr)_auto] lg:items-end"
    >
      <TicketAdjustmentFields users={users} pending={adjustmentMutation.isPending} />
    </form>
  );
}

export function TicketAdjustmentFields({
  users,
  pending = false,
}: {
  users: Array<{ id: string; name: string; email: string; ticketBalance: number }>;
  pending?: boolean;
}) {
  return (
    <>
      <label className="grid min-w-0 gap-1.5 text-sm font-medium">
        사용자
        <select className="h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm" name="userId" required>
          <option value="">선택해 주세요</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} · {user.email} · {user.ticketBalance}장
            </option>
          ))}
        </select>
      </label>
      <label className="grid min-w-0 gap-1.5 text-sm font-medium">
        조정량
        <input
          className="h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm"
          name="amount"
          type="number"
          min="-10000"
          max="10000"
          step="1"
          placeholder="+1 / -1"
          required
        />
      </label>
      <label className="grid min-w-0 gap-1.5 text-sm font-medium">
        사유
        <input
          className="h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm"
          name="reason"
          minLength={3}
          maxLength={500}
          placeholder="고객 지원 지급 등"
          required
        />
      </label>
      <Button className="h-10" disabled={pending} type="submit">
        {pending ? <LoaderCircle className="animate-spin" /> : <Ticket />}
        적용
      </Button>
    </>
  );
}
