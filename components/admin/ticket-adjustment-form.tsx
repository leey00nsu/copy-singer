"use client";

import { LoaderCircle, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";

export function TicketAdjustmentForm({
  users,
}: {
  users: Array<{ id: string; name: string; email: string; ticketBalance: number }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    const response = await fetch("/api/admin/ticket-adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: formData.get("userId"),
        amount: Number(formData.get("amount")),
        reason: formData.get("reason"),
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const payload = (await response.json()) as { balanceAfter?: number; error?: { message?: string } };
    if (!response.ok) {
      toast.error(payload.error?.message ?? "티켓을 조정하지 못했습니다.");
    } else {
      toast.success(`티켓을 조정했습니다. 새 잔액 ${payload.balanceAfter}개`);
      router.refresh();
    }
    setPending(false);
  }

  return (
    <form
      action={submit}
      className="grid gap-4 rounded-2xl border bg-background p-5 lg:grid-cols-[minmax(220px,1fr)_140px_minmax(260px,1.4fr)_auto] lg:items-end"
    >
      <TicketAdjustmentFields users={users} pending={pending} />
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
      <label className="grid gap-1.5 text-sm font-medium">
        사용자
        <select className="h-10 rounded-lg border bg-background px-3 text-sm" name="userId" required>
          <option value="">선택해주세요</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} · {user.email} · {user.ticketBalance}장
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        조정량
        <input
          className="h-10 rounded-lg border bg-background px-3 text-sm"
          name="amount"
          type="number"
          min="-10000"
          max="10000"
          step="1"
          placeholder="+1 / -1"
          required
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        사유
        <input
          className="h-10 rounded-lg border bg-background px-3 text-sm"
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
