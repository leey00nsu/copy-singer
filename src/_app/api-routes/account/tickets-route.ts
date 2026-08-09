import { getTicketAccount } from "@/entities/ticket/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const account = await getTicketAccount(session.user.id, Number.isFinite(page) ? page : 1);
  return Response.json({
    ...account,
    entries: account.entries.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
  });
}
