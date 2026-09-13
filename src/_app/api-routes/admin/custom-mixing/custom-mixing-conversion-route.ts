import { withApiAdmission } from "@/_app/api-routes/admission";
import { adminCustomMixingIdSchema } from "@/features/admin-custom-mixing";
import {
  deleteAdminCustomMixingConversion,
  getAdminCustomMixingConversion,
} from "@/features/admin-custom-mixing/index.server";
import { requireAdminApi } from "@/features/authentication/index.server";

async function handleGET(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  const parsed = adminCustomMixingIdSchema.safeParse((await context.params).id);
  if (!parsed.success) return Response.json({ detail: "Invalid conversion ID." }, { status: 400 });
  return getAdminCustomMixingConversion(request, parsed.data);
}

async function handleDELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  const parsed = adminCustomMixingIdSchema.safeParse((await context.params).id);
  if (!parsed.success) return Response.json({ detail: "Invalid conversion ID." }, { status: 400 });
  return deleteAdminCustomMixingConversion(request, parsed.data);
}

export const GET = withApiAdmission(handleGET);

export const DELETE = withApiAdmission(handleDELETE);
