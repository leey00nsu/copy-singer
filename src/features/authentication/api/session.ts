import "server-only";

import { auth } from "./auth";
import { getDevelopmentAuthBypassSession } from "./dev-bypass";

export type AuthSession = typeof auth.$Infer.Session;

const requestSessions = new WeakMap<Request, Promise<AuthSession | null>>();

export function getRequestSession(request?: Request) {
  if (!request) return resolveRequestSession();
  let session = requestSessions.get(request);
  if (!session) {
    session = resolveRequestSession(request);
    requestSessions.set(request, session);
  }
  return session;
}

async function resolveRequestSession(request?: Request) {
  const requestHeaders = request?.headers ?? (await import("next/headers")).headers();
  const session =
    (await getDevelopmentAuthBypassSession()) ?? (await auth.api.getSession({ headers: await requestHeaders }));
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
