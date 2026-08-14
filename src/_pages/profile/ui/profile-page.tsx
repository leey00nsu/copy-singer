import type { Metadata } from "next";
import { requirePageSession } from "@/features/authentication/index.server";
import { VocalProfileWorkbench } from "./vocal-profile-workbench";

export const metadata: Metadata = {
  title: "보컬 프로필 만들기 — Copysinger",
  description: "한 소절을 들려주면 음역과 보컬 특성을 분석해 잘 맞는 노래와 키를 추천해요.",
};

export default async function ProfilePage() {
  await requirePageSession("/profile");
  return <VocalProfileWorkbench />;
}
