import { getRequestSession } from "@/features/authentication/index.server";
import { LandingPage } from "./landing-page";

export default async function HomePage() {
  const session = await getRequestSession();
  return <LandingPage authenticated={Boolean(session)} />;
}
