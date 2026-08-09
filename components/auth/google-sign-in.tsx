"use client";

import { LogIn } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/shared/ui/button";

export function GoogleSignIn({ callbackURL, configured }: { callbackURL: string; configured: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const result = await authClient.signIn.social({ provider: "google", callbackURL });
    if (result.error) {
      setError("Google 로그인을 시작하지 못했어요. OAuth 설정을 확인해주세요.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button className="h-11 w-full text-sm" disabled={!configured || pending} onClick={signIn}>
        <LogIn aria-hidden="true" />
        {pending ? "Google로 이동 중…" : "Google로 계속하기"}
      </Button>
      {!configured ? (
        <p className="text-center text-xs text-amber-700">Google OAuth 환경변수를 먼저 설정해주세요.</p>
      ) : null}
      {error ? <p className="text-center text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
