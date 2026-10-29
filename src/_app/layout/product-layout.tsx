import type { ReactNode } from "react";

import {
  getRequestSession,
  isAdminEmail,
  isDevelopmentAuthBypassSession,
} from "@/features/authentication/index.server";
import { PRIVATE_METADATA } from "@/shared/config/index.server";
import { ProductShell } from "@/widgets/product-shell";
import { getOnboardingSnapshot } from "@/widgets/product-shell/index.server";

const productMetadata = PRIVATE_METADATA;

async function ProductLayout({ children }: { children: ReactNode }) {
  const session = await getRequestSession();

  // Each page owns its authentication boundary; public trials share the same shell.
  if (!session) return <ProductShell user={null}>{children}</ProductShell>;

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
