import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

export const resourceRowInteractiveClassName =
  "group/resource-row relative isolate cursor-pointer transition-colors hover:bg-muted/35 focus-within:bg-muted/35";

export function ResourceRowLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset",
        className,
      )}
      data-resource-row-link=""
      {...props}
    />
  );
}
