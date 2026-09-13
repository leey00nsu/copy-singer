import { withApiAdmission } from "@/_app/api-routes/admission";
import { markAllNotificationsRead } from "@/entities/notification/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";

async function handlePOST(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  return Response.json(await markAllNotificationsRead(session.user.id));
}

export const POST = withApiAdmission(handlePOST);
