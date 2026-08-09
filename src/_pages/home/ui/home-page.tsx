import { requirePageSession } from "@/features/authentication/index.server";
import { VocalProfileWorkbench } from "@/widgets/vocal-profile-workbench";

export default async function Home() {
  await requirePageSession("/");
  return <VocalProfileWorkbench />;
}
