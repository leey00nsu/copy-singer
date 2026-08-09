import { AudioWaveform } from "lucide-react";
import Link from "next/link";

import { cn } from "@/shared/lib/cn";

function ProductBrand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link className={cn("inline-flex items-center gap-2 text-sm font-semibold tracking-tight", className)} href={href}>
      <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-background">
        <AudioWaveform aria-hidden="true" className="size-4" />
      </span>
      <span>Copy Singer</span>
    </Link>
  );
}

export { ProductBrand };
