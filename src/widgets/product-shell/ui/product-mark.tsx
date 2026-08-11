import Image from "next/image";

import { cn } from "@/shared/lib/cn";

function ProductMark({ className, preload = false }: { className?: string; preload?: boolean }) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn("size-6 object-contain", className)}
      height={1024}
      preload={preload}
      src="/brand/copy-singer-mark.png"
      width={1024}
    />
  );
}

export { ProductMark };
