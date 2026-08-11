"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Pencil, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { toast } from "sonner";
import {
  deleteVocalProfileMutationOptions,
  renameVocalProfileMutationOptions,
  vocalProfileRenameRequestSchema,
} from "@/entities/vocal-profile";
import { createRecommendationMutationOptions } from "@/features/create-recommendation";
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
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

function RenameVocalProfileAction({
  displayName,
  disabled,
  profileId,
}: {
  displayName: string;
  disabled: boolean;
  profileId: string;
}) {
  const inputId = useId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const renameProfile = useMutation(renameVocalProfileMutationOptions());
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(displayName);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = vocalProfileRenameRequestSchema.safeParse({ displayName: value });
    if (!parsed.success) {
      setValidationMessage(parsed.error.issues[0]?.message ?? "프로필 이름을 확인해주세요.");
      return;
    }
    setValidationMessage(null);
    renameProfile.mutate(
      { id: profileId, displayName: parsed.data.displayName },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ["vocal-profile"] });
          setOpen(false);
          toast.success("프로필 이름을 변경했습니다.");
          router.refresh();
        },
        onError: (error) => setValidationMessage(error.message),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setValue(displayName);
          setValidationMessage(null);
        }
      }}
    >
      <DialogTrigger render={<Button disabled={disabled} variant="outline" />}>
        <Pencil className="size-4" aria-hidden="true" /> 이름 변경
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>프로필 이름 변경</DialogTitle>
            <DialogDescription>목록과 상세 화면에서 사용할 이름을 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-2">
            <Label htmlFor={inputId}>프로필 이름</Label>
            <Input
              aria-describedby={validationMessage ? `${inputId}-error` : undefined}
              aria-invalid={validationMessage ? true : undefined}
              autoComplete="off"
              disabled={renameProfile.isPending}
              id={inputId}
              maxLength={40}
              onChange={(event) => setValue(event.currentTarget.value)}
              value={value}
            />
            <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
              <p className="text-destructive" id={`${inputId}-error`} role={validationMessage ? "alert" : undefined}>
                {validationMessage}
              </p>
              <span className="ml-auto tabular-nums">{value.length}/40</span>
            </div>
          </div>
          <DialogFooter className="mt-5">
            <DialogClose render={<Button disabled={renameProfile.isPending} variant="outline" />}>취소</DialogClose>
            <Button disabled={renameProfile.isPending} type="submit">
              {renameProfile.isPending ? (
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : null}
              {renameProfile.isPending ? "저장 중" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VocalProfileActions({
  displayName,
  profileId,
  latestRecommendationId,
}: {
  displayName: string;
  profileId: string;
  latestRecommendationId: string | null;
}) {
  const router = useRouter();
  const createRecommendation = useMutation(createRecommendationMutationOptions());
  const deleteProfile = useMutation(deleteVocalProfileMutationOptions());

  const create = () => {
    createRecommendation.mutate(profileId, {
      onSuccess: (run) => {
        toast.success("목소리에 맞는 노래를 찾았습니다.");
        router.push(`/recommendations/${run.id}`);
      },
      onError: () => toast.error("노래 추천을 만들지 못했습니다. 잠시 뒤 다시 시도해주세요."),
    });
  };

  const remove = () => {
    deleteProfile.mutate(profileId, {
      onSuccess: () => {
        toast.success("보컬 프로필을 삭제했습니다.");
        router.push("/vocal-profiles");
        router.refresh();
      },
      onError: () => toast.error("보컬 프로필을 삭제하지 못했습니다. 잠시 뒤 다시 시도해주세요."),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RenameVocalProfileAction
        disabled={createRecommendation.isPending || deleteProfile.isPending}
        displayName={displayName}
        profileId={profileId}
      />
      {latestRecommendationId ? (
        <Link className={buttonVariants()} href={`/recommendations/${latestRecommendationId}`}>
          <Sparkles className="size-4" aria-hidden="true" /> 최근 추천 결과 보기
        </Link>
      ) : (
        <Button disabled={createRecommendation.isPending || deleteProfile.isPending} onClick={create}>
          {createRecommendation.isPending ? (
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          {createRecommendation.isPending ? "노래를 찾는 중" : "맞는 노래 찾기"}
        </Button>
      )}
      <Dialog>
        <DialogTrigger
          render={<Button disabled={createRecommendation.isPending || deleteProfile.isPending} variant="ghost" />}
        >
          <Trash2 className="size-4" aria-hidden="true" /> 삭제
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이 보컬 프로필을 삭제할까요?</DialogTitle>
            <DialogDescription>
              제출한 보컬과 연결된 추천·믹싱 기록도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button disabled={deleteProfile.isPending} onClick={remove} variant="destructive">
              {deleteProfile.isPending ? (
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              {deleteProfile.isPending ? "삭제 중" : "프로필 삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
