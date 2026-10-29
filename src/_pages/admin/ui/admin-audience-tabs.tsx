"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export function AdminAudienceTabs({
  audience,
  members,
  guests,
  membersHref,
  guestsHref,
  children,
}: {
  audience: "members" | "guests";
  members: number;
  guests: number;
  membersHref: string;
  guestsHref: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Tabs
      value={audience}
      onValueChange={(value) =>
        startTransition(() => router.push(value === "guests" ? guestsHref : membersHref, { scroll: false }))
      }
    >
      <TabsList aria-label="사용자 구분">
        <TabsTrigger value="members">
          회원 <span className="ml-1 text-xs text-muted-foreground">{members}</span>
        </TabsTrigger>
        <TabsTrigger value="guests">
          체험 방문자 <span className="ml-1 text-xs text-muted-foreground">{guests}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value={audience} className="pt-5" aria-busy={pending}>
        {pending ? (
          <p className="sr-only" role="status">
            목록을 불러오는 중
          </p>
        ) : null}
        {children}
      </TabsContent>
    </Tabs>
  );
}
