import Link from "next/link";
import { Skeleton } from "@/shared/ui/skeleton";

export function AdminNavigationLoading() {
  return (
    <div aria-hidden="true" className="mt-8 flex gap-6 overflow-hidden border-b pb-3">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-5 w-20 shrink-0" />
      ))}
    </div>
  );
}

export function AdminNavigation({
  current,
  usersHref = "/admin",
  mixingHref = "/admin?tab=mixing",
}: {
  current: "users" | "mixing" | "songs" | "custom";
  usersHref?: string;
  mixingHref?: string;
}) {
  const items = [
    { id: "users", label: "회원·체험", href: usersHref },
    { id: "mixing", label: "믹싱 작업", href: mixingHref },
    { id: "songs", label: "음원 관리", href: "/admin/songs" },
    { id: "custom", label: "커스텀 믹싱", href: "/admin/custom-mixing" },
  ];
  return (
    <nav aria-label="관리 메뉴" className="mt-8 flex gap-6 overflow-x-auto border-b text-sm">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          scroll={false}
          aria-current={current === item.id ? "page" : undefined}
          className="shrink-0 border-b-2 border-transparent px-0.5 pb-3 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] aria-[current=page]:border-foreground aria-[current=page]:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
