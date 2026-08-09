"use client";

import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteVocalProfileMutationOptions } from "@/entities/vocal-profile";
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

export function VocalProfileActions({
  profileId,
  latestRecommendationId,
}: {
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
      {latestRecommendationId ? (
        <Button disabled={createRecommendation.isPending || deleteProfile.isPending} onClick={create} variant="outline">
          {createRecommendation.isPending ? (
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          새 추천 만들기
        </Button>
      ) : null}
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
