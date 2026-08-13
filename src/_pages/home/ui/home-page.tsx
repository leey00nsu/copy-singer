import {
  getRequestSession,
  isAdminEmail,
  isDevelopmentAuthBypassSession,
} from "@/features/authentication/index.server";
import { buildHomeMetadata } from "@/shared/config/index.server";
import { LandingPage } from "./landing-page";

const homeMetadata = buildHomeMetadata();

export default async function HomePage() {
  const session = await getRequestSession();
  return (
    <LandingPage
      admin={session ? isAdminEmail(session.user.email) : false}
      user={
        session
          ? {
              developmentBypass: isDevelopmentAuthBypassSession(session.session),
              email: session.user.email,
              image: session.user.image,
              name: session.user.name,
            }
          : null
      }
    />
  );
}

export { homeMetadata };
