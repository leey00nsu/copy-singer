import { VocalProfileWorkbench } from "@/components/vocal-profile-workbench";
import { requirePageSession } from "@/features/authentication/index.server";

export default async function Home() {
  await requirePageSession("/");
  return <VocalProfileWorkbench />;
}
