"use client";

import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function UserMenu({ name, image }: { name: string; image?: string | null }) {
  async function signOut() {
    await authClient.signOut();
    window.location.assign("/login");
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
      <Button variant="ghost" size="icon-sm" aria-label="로그아웃" onClick={signOut}>
        <LogOut aria-hidden="true" />
      </Button>
    </div>
  );
}
