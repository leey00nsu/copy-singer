"use client";

import { useMutation } from "@tanstack/react-query";
import { Download, FileJson, LoaderCircle, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/shared/ui/button";
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
import { Label } from "@/shared/ui/label";
import { StatusNotice } from "@/shared/ui/status-notice";
import { type CatalogImportResult, importAdminCatalogSnapshot } from "../api/client";

export function CatalogSnapshotToolbar({ canExport = true }: { canExport?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CatalogImportResult | null>(null);
  const importMutation = useMutation({
    mutationFn: importAdminCatalogSnapshot,
    onSuccess: (nextResult) => {
      setResult(nextResult);
      toast.success(`카탈로그를 가져왔어요. ${nextResult.total}곡 중 ${nextResult.published}곡이 공개 상태예요.`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "카탈로그를 가져오지 못했어요.");
    },
  });

  const submit = () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error("가져올 스냅샷 파일을 선택해 주세요.");
      return;
    }
    setResult(null);
    importMutation.mutate(file);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canExport ? (
        <a className={buttonVariants({ size: "sm", variant: "outline" })} download href="/api/admin/catalog/export">
          <Download className="size-3.5" /> 내보내기
        </a>
      ) : null}
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setResult(null);
            if (inputRef.current) inputRef.current.value = "";
          }
        }}
      >
        <DialogTrigger render={<Button size="sm" />}>
          <UploadCloud className="size-3.5" /> 가져오기
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>카탈로그 가져오기</DialogTitle>
            <DialogDescription>
              내보낸 JSON 스냅샷을 가져오면 곡·출처·분석·원곡 파일·카탈로그를 복원해요. 같은 스냅샷을 다시 가져와도
              중복으로 만들지 않아요.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-2">
            <Label htmlFor="catalog-snapshot-file">스냅샷 파일</Label>
            <input
              accept="application/json,.json"
              className="h-10 rounded-md border bg-background px-3 text-xs file:mr-3 file:h-full file:border-0 file:bg-muted file:px-3 file:text-xs file:font-medium"
              disabled={importMutation.isPending}
              id="catalog-snapshot-file"
              ref={inputRef}
              type="file"
            />
            {result ? (
              <StatusNotice
                description={`${result.total}곡 중 ${result.published}곡을 공개 상태로 복원했어요. 새 항목: 곡 ${result.songsCreated} · 출처 ${result.sourcesCreated} · 분석 ${result.analysesCreated} · 원곡 파일 ${result.targetsCreated} · 카탈로그 ${result.entriesCreated}`}
                title="가져오기 완료"
                tone="success"
              />
            ) : null}
          </div>
          <DialogFooter className="mt-5">
            <DialogClose render={<Button disabled={importMutation.isPending} variant="outline" />}>취소</DialogClose>
            <Button disabled={importMutation.isPending} onClick={() => void submit()}>
              {importMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <FileJson className="size-4" />
              )}
              {importMutation.isPending ? "가져오는 중…" : "가져오기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
