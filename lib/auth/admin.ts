import "server-only";

import { notFound } from "next/navigation";
import { getRequestSession, requireApiSession, unauthorizedResponse } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/admin-policy";

export { adminEmails, isAdminEmail } from "@/lib/auth/admin-policy";

export async function requireAdminPage() {
  const session = await getRequestSession();
  if (!session || !isAdminEmail(session.user.email)) notFound();
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
