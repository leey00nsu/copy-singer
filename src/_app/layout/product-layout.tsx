import type { ReactNode } from "react";

import {
  getRequestSession,
  isAdminEmail,
  isDevelopmentAuthBypassSession,
} from "@/features/authentication/index.server";
import { getOnboardingSnapshot } from "@/features/complete-onboarding/index.server";
import { PRIVATE_METADATA } from "@/shared/config/index.server";
import { ProductShell } from "@/widgets/product-shell";

const productMetadata = PRIVATE_METADATA;

async function ProductLayout({ children }: { children: ReactNode }) {
  const session = await getRequestSession();

  // 각 Page가 자신의 정확한 callback URL로 인증을 요구한다. Layout은 인증된
  // 요청에만 persistent shell을 더해 callback 정밀도와 URL 호환성을 보존한다.
  if (!session) return children;

  const developmentBypass = isDevelopmentAuthBypassSession(session.session);
  let onboarding: Awaited<ReturnType<typeof getOnboardingSnapshot>> | undefined;
  if (!developmentBypass) {
    try {
      onboarding = await getOnboardingSnapshot(session.user.id);
    } catch (error) {
      console.error("Failed to load the user onboarding snapshot.", error);
    }
  }

  return (
    <ProductShell
      admin={isAdminEmail(session.user.email)}
      onboarding={onboarding}
      user={{
        developmentBypass,
        email: session.user.email,
        image: session.user.image,
        name: session.user.name,
      }}
    >
      {children}
    </ProductShell>
  );
}

export { ProductLayout, productMetadata };
