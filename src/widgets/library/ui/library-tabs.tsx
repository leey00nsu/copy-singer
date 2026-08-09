import { AudioLines, WandSparkles } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { type LibraryTab, libraryTabHref } from "../model/search-params";

export function LibraryTabs({ tab }: { tab: LibraryTab }) {
  return (
    <div className="border-b">
      <Tabs value={tab}>
        <TabsList aria-label="라이브러리 종류" className="justify-start" variant="line">
          <TabsTrigger
            className="flex-none"
            nativeButton={false}
            render={<Link href={libraryTabHref("profiles")} />}
            value="profiles"
          >
            <AudioLines aria-hidden="true" /> 보컬 프로필
          </TabsTrigger>
          <TabsTrigger
            className="flex-none"
            nativeButton={false}
            render={<Link href={libraryTabHref("mixes")} />}
            value="mixes"
          >
            <WandSparkles aria-hidden="true" /> AI 믹스
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
