import "server-only";

import { ensureSignupTicketGrants } from "@/entities/ticket/index.server";
import { auth } from "./auth";
import { getDevelopmentAuthBypassSession } from "./dev-bypass";

export type AuthSession = typeof auth.$Infer.Session;

export async function getRequestSession(request?: Request) {
  const requestHeaders = request?.headers ?? (await import("next/headers")).headers();
  const session =
    (await getDevelopmentAuthBypassSession()) ?? (await auth.api.getSession({ headers: await requestHeaders }));
  if (session) await ensureSignupTicketGrants(session.user.id);
  return session;
}

export async function requirePageSession(returnTo = "/") {
  const session = await getRequestSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    return redirect(`/login?callbackURL=${encodeURIComponent(returnTo)}`);
  }
  return session;
}

export async function requireApiSession(request: Request) {
  return getRequestSession(request);
}

export function unauthorizedResponse() {
  return Response.json(
    { error: { code: "UNAUTHENTICATED", message: "Google 로그인이 필요해요.", retryable: false } },
    { status: 401 },
  );
}
