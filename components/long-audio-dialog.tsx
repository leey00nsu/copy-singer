"use client";

import { Scissors } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface LongAudioDialogProps {
  durationSeconds: number | null;
  fileName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LongAudioDialog({ durationSeconds, fileName, onCancel, onConfirm }: LongAudioDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === cancelRef.current) {
        event.preventDefault();
        confirmRef.current?.focus();
      } else if (!event.shiftKey && document.activeElement === confirmRef.current) {
        event.preventDefault();
        cancelRef.current?.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="presentation">
      <section
        aria-describedby="long-audio-description"
        aria-labelledby="long-audio-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl"
        role="dialog"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Scissors className="size-5" />
        </span>
        <h2 className="mt-4 text-xl font-semibold tracking-tight" id="long-audio-title">
          파일의 길이가 너무 길어요. 자동으로 자를까요?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground" id="long-audio-description">
          첫 음이 감지되는 지점부터 최대 60초를 사용합니다. 원본 파일은 변경하지 않아요.
        </p>
        <div className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-sm">
          <p className="truncate font-medium">{fileName}</p>
          {durationSeconds !== null ? (
            <p className="mt-1 text-xs text-muted-foreground">약 {Math.ceil(durationSeconds)}초</p>
          ) : null}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} ref={cancelRef} variant="outline">
            아니오
          </Button>
          <Button onClick={onConfirm} ref={confirmRef}>
            <Scissors className="size-4" /> 예, 자동으로 자르기
          </Button>
        </div>
      </section>
    </div>
  );
}
