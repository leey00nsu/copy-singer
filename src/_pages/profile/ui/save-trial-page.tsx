import { requirePageSession } from "@/features/authentication/index.server";
import { SaveTrial } from "./save-trial";

export default async function SaveTrialPage() {
  await requirePageSession("/profile/save-trial");
  return <SaveTrial />;
}
