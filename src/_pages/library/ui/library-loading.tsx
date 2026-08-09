import { PageSkeleton } from "@/shared/ui/page-skeleton";

export default function LibraryLoading() {
  return <PageSkeleton label="라이브러리를 불러오는 중" rows={5} />;
}
