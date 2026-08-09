import { LoaderCircle } from "lucide-react";

export default function RecommendationLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" /> 추천 결과를 불러오는 중…
      </p>
    </main>
  );
}
