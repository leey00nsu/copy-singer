import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getDevelopmentAuthBypassSession } from "@/lib/auth/dev-bypass";
import { ensureSignupGrant } from "@/lib/tickets/service";

export type AuthSession = typeof auth.$Infer.Session;

export async function getRequestSession(request?: Request) {
  const session =
    (await getDevelopmentAuthBypassSession()) ??
    (await auth.api.getSession({ headers: request?.headers ?? (await headers()) }));
  if (session) await ensureSignupGrant(session.user.id);
  return session;
}

export async function requirePageSession(returnTo = "/") {
  const session = await getRequestSession();
  if (!session) {
    redirect(`/login?callbackURL=${encodeURIComponent(returnTo)}`);
  }
  return session;
}

export async function requireApiSession(request: Request) {
  return getRequestSession(request);
}

export function unauthorizedResponse() {
  return Response.json(
    { error: { code: "UNAUTHENTICATED", message: "Google 로그인이 필요합니다.", retryable: false } },
    { status: 401 },
  );
}
