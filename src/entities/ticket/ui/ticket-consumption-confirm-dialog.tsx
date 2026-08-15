"use client";

import { Ticket } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { type TicketKind, ticketKindLabel } from "../model/contract";

type TicketConsumptionConfirmDialogProps = {
  actionName: string;
  children: ReactNode;
  confirmLabel: string;
  cost: number;
  kind: TicketKind;
  onConfirm: () => void;
  triggerProps?: Omit<ComponentProps<typeof Button>, "children" | "onClick">;
};

export function TicketConsumptionConfirmDialog({
  actionName,
  children,
  confirmLabel,
  cost,
  kind,
  onConfirm,
  triggerProps,
}: TicketConsumptionConfirmDialogProps) {
  if (cost <= 0) {
    return (
      <Button {...triggerProps} onClick={onConfirm}>
        {children}
      </Button>
    );
  }

  const label = ticketKindLabel(kind);

  return (
    <Dialog>
      <DialogTrigger render={<Button {...triggerProps} />}>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {label} {cost}장을 사용할까요?
          </DialogTitle>
          <DialogDescription>
            확인하면 {actionName}을 바로 시작하고 {label} {cost}장을 사용해요.
          </DialogDescription>
        </DialogHeader>
        <dl className="rounded-lg bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2 text-xs text-muted-foreground">
              <Ticket aria-hidden="true" className="size-4" /> 사용 티켓
            </dt>
            <dd className="text-sm font-semibold tabular-nums">
              {label} {cost}장
            </dd>
          </div>
        </dl>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
          <DialogClose render={<Button onClick={onConfirm} />}>{confirmLabel}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
