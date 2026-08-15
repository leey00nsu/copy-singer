import { getTicketWallets } from "@/entities/ticket/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  return Response.json(await getTicketWallets(session.user.id));
}
