"use client";

import { Scissors } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

interface LongAudioDialogProps {
  durationSeconds: number | null;
  fileName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LongAudioDialog({ durationSeconds, fileName, onCancel, onConfirm }: LongAudioDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog onOpenChange={(open) => !open && onCancel()} open>
      <DialogContent className="sm:max-w-md" initialFocus={confirmRef} showCloseButton={false}>
        <DialogHeader>
          <span className="flex size-10 items-center justify-center rounded-md border bg-accent text-accent-foreground">
            <Scissors aria-hidden="true" className="size-5" />
          </span>
          <DialogTitle className="mt-2 text-xl leading-7">파일의 길이가 너무 길어요. 자동으로 자를까요?</DialogTitle>
          <DialogDescription className="leading-6">
            첫 음이 감지되는 지점부터 최대 60초를 사용합니다. 원본 파일은 변경하지 않아요.
          </DialogDescription>
        </DialogHeader>
        <div className="border-y bg-muted/35 px-4 py-3 text-sm">
          <p className="truncate font-medium">{fileName}</p>
          {durationSeconds !== null ? (
            <p className="mt-1 text-xs text-muted-foreground">약 {Math.ceil(durationSeconds)}초</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={onCancel} variant="outline">
            아니오
          </Button>
          <Button onClick={onConfirm} ref={confirmRef}>
            <Scissors aria-hidden="true" className="size-4" /> 예, 자동으로 자르기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
