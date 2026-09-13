import { withApiAdmission } from "@/_app/api-routes/admission";
import { getTicketWallets } from "@/entities/ticket/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";

async function handleGET(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  return Response.json(await getTicketWallets(session.user.id));
}

export const GET = withApiAdmission(handleGET);
