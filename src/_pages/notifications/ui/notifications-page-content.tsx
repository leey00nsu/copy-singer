import type { ReactNode } from "react";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";

export function NotificationsPageContent({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[72rem] px-5 py-12 sm:px-7 lg:px-8 lg:py-14">
      <ProductPageIntro
        description="보컬 분석·AI 믹싱 결과와 티켓 지급 알림을 확인할 수 있어요."
        eyebrow="Notifications"
        title="알림"
      />
      <div className="mt-8">{children}</div>
    </div>
  );
}
