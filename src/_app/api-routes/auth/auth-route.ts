import { toNextJsHandler } from "better-auth/next-js";
import { withAuthAdmission } from "@/_app/api-routes/admission";
import { auth } from "@/features/authentication/index.server";

const handlers = toNextJsHandler(auth);
export const GET = withAuthAdmission(handlers.GET);
export const POST = withAuthAdmission(handlers.POST);
