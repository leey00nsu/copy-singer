export const creationFunnelSteps = [
  { id: "analysis", label: "목소리 분석" },
  { id: "recommendation", label: "노래 추천" },
  { id: "mixing", label: "AI 믹싱" },
] as const;

export type CreationFunnelStep = (typeof creationFunnelSteps)[number]["id"];

export type ActualStateStep = {
  description: string;
  id: string;
  label: string;
  state: "complete" | "reached" | "current" | "upcoming" | "skipped";
};
