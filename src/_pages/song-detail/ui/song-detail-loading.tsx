import { LoaderCircle } from "lucide-react";

export default function SongDetailLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      <p aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> 곡 상세를
        불러오는 중…
      </p>
    </div>
  );
}
