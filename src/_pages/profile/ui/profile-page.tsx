import type { Metadata } from "next";
import { requirePageSession } from "@/features/authentication/index.server";
import { VocalProfileWorkbench } from "./vocal-profile-workbench";

export const metadata: Metadata = {
  title: "보컬 프로필 만들기 — Copy Singer",
  description: "안내 멜로디를 따라 부르고 노래 추천을 위한 보컬 프로필을 만드세요.",
};

export default async function ProfilePage() {
  await requirePageSession("/profile");
  return <VocalProfileWorkbench />;
}
