"use client";

import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { authClient } from "../api/auth-client";

type UserMenuProps = {
  admin?: boolean;
  email?: string;
  image?: string | null;
  name: string;
  side?: "bottom" | "left" | "right" | "top";
};

export function UserMenu({ name, email, image, admin = false, side = "bottom" }: UserMenuProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setPending(true);
    setError(null);
    const result = await authClient.signOut();
    if (result.error) {
      setPending(false);
      setError("로그아웃하지 못했어요. 다시 시도해 주세요.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="w-full">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`${name} 계정 메뉴`}
              className="h-auto w-full justify-start gap-3 p-2 text-left"
              variant="ghost"
            />
          }
        >
          {image ? (
            <Image
              alt=""
              className="size-8 rounded-full object-cover"
              height={32}
              referrerPolicy="no-referrer"
              src={image}
              unoptimized
              width={32}
            />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <UserRound className="size-4" aria-hidden="true" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{name}</span>
            {email ? <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span> : null}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" side={side} sideOffset={8}>
          <DropdownMenuLabel>계정</DropdownMenuLabel>
          <DropdownMenuItem nativeButton={false} render={<Link href="/account" />}>
            <UserRound aria-hidden="true" /> 내 계정
          </DropdownMenuItem>
          {admin ? (
            <DropdownMenuItem nativeButton={false} render={<Link href="/admin" />}>
              <ShieldCheck aria-hidden="true" /> 관리
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={pending} onClick={() => void signOut()}>
            <LogOut aria-hidden="true" /> {pending ? "로그아웃 중…" : "로그아웃"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <p className="mt-2 px-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
