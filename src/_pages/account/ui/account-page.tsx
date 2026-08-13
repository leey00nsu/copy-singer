import type { Metadata } from "next";
import { getTicketAccount } from "@/entities/ticket/index.server";
import { getAuthenticationSummary, isAdminEmail, requirePageSession } from "@/features/authentication/index.server";
import { pageSearchParamSchema } from "@/shared/api";
import { AccountOverview } from "./account-overview";

export const metadata: Metadata = {
  title: "내 계정 — Copysinger",
  description: "로그인 계정과 티켓 잔액, 변경 내역을 확인하세요.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePageSession("/account");
  const page = pageSearchParamSchema.parse((await searchParams).page);
  const [account, authentication] = await Promise.all([
    getTicketAccount(session.user.id, page),
    getAuthenticationSummary(session.user.id),
  ]);

  return (
    <AccountOverview
      account={account}
      admin={isAdminEmail(session.user.email)}
      authentication={authentication}
      user={{ email: session.user.email, name: session.user.name }}
    />
  );
}
