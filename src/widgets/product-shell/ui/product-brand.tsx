import { AudioWaveform } from "lucide-react";
import Link from "next/link";

import { cn } from "@/shared/lib/cn";

function ProductBrand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      className={cn("inline-flex items-center gap-2 text-[13px] font-semibold tracking-[-0.02em]", className)}
      href={href}
    >
      <span className="flex size-6 items-center justify-center text-foreground">
        <AudioWaveform aria-hidden="true" className="size-5" />
      </span>
      <span>Copy Singer</span>
    </Link>
  );
}

export { ProductBrand };
