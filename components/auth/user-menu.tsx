"use client";

import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function UserMenu({ name, image, admin = false }: { name: string; image?: string | null; admin?: boolean }) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 rounded-full border bg-background/95 p-1.5 pl-2 shadow-sm backdrop-blur">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-7 rounded-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="flex size-7 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-4" aria-hidden="true" />
        </span>
      )}
      <span className="max-w-32 truncate text-xs font-medium">{name}</span>
      <Button variant="ghost" size="sm" render={<Link href="/mixing-history" />}>믹싱 내역</Button>
      <Button variant="ghost" size="sm" render={<Link href="/account" />}>내 계정</Button>
      {admin ? <Button variant="ghost" size="sm" render={<Link href="/admin" />}>관리</Button> : null}
      <Button variant="ghost" size="icon-sm" aria-label="로그아웃" onClick={signOut}>
        <LogOut aria-hidden="true" />
      </Button>
    </div>
  );
}
