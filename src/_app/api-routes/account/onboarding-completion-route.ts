import { withApiAdmission } from "@/_app/api-routes/admission";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { completeOnboarding } from "@/widgets/product-shell/index.server";

async function handlePOST(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  return Response.json(await completeOnboarding(session.user.id));
}

export const POST = withApiAdmission(handlePOST);
