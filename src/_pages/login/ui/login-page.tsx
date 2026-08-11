import { redirect } from "next/navigation";

import { safeCallbackURL } from "@/features/authentication";
import { getRequestSession, googleAuthConfigured } from "@/features/authentication/index.server";
import { LoginScreen } from "./login-screen";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string | string[] }>;
}) {
  const callbackURL = safeCallbackURL((await searchParams).callbackURL);
  if (await getRequestSession()) redirect(callbackURL);

  return <LoginScreen callbackURL={callbackURL} configured={googleAuthConfigured()} />;
}
