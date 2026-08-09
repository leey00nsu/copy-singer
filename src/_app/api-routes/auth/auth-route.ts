import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/features/authentication/index.server";

export const { GET, POST } = toNextJsHandler(auth);
