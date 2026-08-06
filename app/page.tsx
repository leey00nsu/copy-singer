import { VocalProfileWorkbench } from "@/components/vocal-profile-workbench";
import { requirePageSession } from "@/lib/auth/session";

export default async function Home() {
  await requirePageSession("/");
  return <VocalProfileWorkbench />;
}
