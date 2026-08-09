import { PageSkeleton } from "@/shared/ui/page-skeleton";

export function ProductRouteLoading() {
  return <PageSkeleton label="제품 페이지를 불러오는 중" rows={4} />;
}
