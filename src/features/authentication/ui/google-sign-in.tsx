"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { authClient } from "../api/auth-client";
import { GoogleIcon } from "./google-icon";

export function GoogleSignIn({ callbackURL, configured }: { callbackURL: string; configured: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const result = await authClient.signIn.social({ provider: "google", callbackURL });
    if (result.error) {
      setError("Google 로그인을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        className="h-12 w-full justify-center bg-background text-sm font-semibold shadow-sm hover:bg-muted/40"
        disabled={!configured || pending}
        onClick={signIn}
        variant="outline"
      >
        <GoogleIcon className="size-5" />
        {pending ? "구글로 이동 중…" : "구글로 시작하기"}
      </Button>
      {!configured ? (
        <p className="text-center text-xs text-warning-foreground">현재 Google 로그인을 사용할 수 없어요.</p>
      ) : null}
      <p aria-live="polite" className="text-center text-xs text-destructive" role={error ? "alert" : undefined}>
        {error}
      </p>
    </div>
  );
}
