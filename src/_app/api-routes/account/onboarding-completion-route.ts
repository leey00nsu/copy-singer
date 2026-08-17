import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { completeOnboarding } from "@/features/complete-onboarding/index.server";

export async function POST(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  return Response.json(await completeOnboarding(session.user.id));
}
