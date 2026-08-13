import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { AdminCustomMixingPanel } from "@/features/admin-custom-mixing";
import { requireAdminPage } from "@/features/authentication/index.server";
import { PRIVATE_METADATA } from "@/shared/config/index.server";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";
import { ProductFooter, ProductHeader } from "@/widgets/product-shell";

export const adminCustomMixingMetadata = PRIVATE_METADATA;

export default async function AdminCustomMixingPage() {
  const session = await requireAdminPage();
  return (
    <div className="min-h-screen bg-background">
      <ProductHeader admin user={{ email: session.user.email, image: session.user.image, name: session.user.name }} />
      <main className="mx-auto w-full max-w-[72rem] px-6 py-8 lg:px-8 lg:py-10">
        <Link
          className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          href="/admin"
        >
          <ChevronLeft className="size-3.5" /> 운영 대시보드
        </Link>
        <ProductPageIntro
          description="저장된 보컬 프로필과 임시 음원으로 커스텀 AI 믹싱을 실행합니다. 업로드한 target 음원과 결과는 저장되지 않습니다."
          eyebrow="Admin"
          title="커스텀 믹싱"
        />
        <div className="mt-8">
          <AdminCustomMixingPanel />
        </div>
      </main>
      <ProductFooter />
    </div>
  );
}
