import Link from "next/link";

import { cn } from "@/shared/lib/cn";
import { ProductMark } from "./product-mark";

function ProductBrand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      className={cn("inline-flex items-center gap-2 text-[13px] font-semibold tracking-[-0.02em]", className)}
      href={href}
    >
      <ProductMark />
      <span className="font-brand font-bold">Copysinger</span>
    </Link>
  );
}

export { ProductBrand };
