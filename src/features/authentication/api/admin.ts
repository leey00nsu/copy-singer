import "server-only";

import { isAdminEmail } from "../model/admin-policy";
import { getRequestSession, requireApiSession, unauthorizedResponse } from "./session";

export { adminEmails, isAdminEmail } from "../model/admin-policy";

export async function requireAdminPage() {
  const session = await getRequestSession();
  if (!session || !isAdminEmail(session.user.email)) {
    const { notFound } = await import("next/navigation");
    return notFound();
  }
  return session;
}

export async function requireAdminApi(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return { response: unauthorizedResponse(), session: null } as const;
  if (!isAdminEmail(session.user.email)) {
    return {
      response: Response.json({ error: { code: "FORBIDDEN", message: "관리자 권한이 필요합니다." } }, { status: 403 }),
      session: null,
    } as const;
  }
  return { response: null, session } as const;
}
