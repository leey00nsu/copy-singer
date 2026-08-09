import type { ReactNode } from "react";

import { getRequestSession, isAdminEmail } from "@/features/authentication/index.server";
import { ProductShell } from "@/widgets/product-shell";

async function ProductLayout({ children }: { children: ReactNode }) {
  const session = await getRequestSession();

  // 각 Page가 자신의 정확한 callback URL로 인증을 요구한다. Layout은 인증된
  // 요청에만 persistent shell을 더해 callback 정밀도와 URL 호환성을 보존한다.
  if (!session) return children;

  return (
    <ProductShell
      admin={isAdminEmail(session.user.email)}
      user={{ email: session.user.email, image: session.user.image, name: session.user.name }}
    >
      {children}
    </ProductShell>
  );
}

export { ProductLayout };
