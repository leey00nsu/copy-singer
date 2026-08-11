import Image from "next/image";

import { cn } from "@/shared/lib/cn";

function ProductMark({ className }: { className?: string }) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn("size-6 object-contain", className)}
      height={1024}
      src="/brand/copy-singer-mark.png"
      width={1024}
    />
  );
}

export { ProductMark };
