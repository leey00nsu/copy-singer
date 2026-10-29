import { requirePageSession } from "@/features/authentication/index.server";
import { SaveTrial } from "./save-trial";

export default async function SaveTrialPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const value = (await searchParams).next;
  const next = typeof value === "string" ? value : undefined;
  await requirePageSession(`/profile/save-trial${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return <SaveTrial next={next} />;
}
