import type { ReactNode } from "react";

export function FunnelActionBar({
  action,
  description,
  eyebrow,
  title,
}: {
  action: ReactNode;
  description?: ReactNode;
  eyebrow: string;
  title: ReactNode;
}) {
  return (
    <aside
      className="border-y bg-background/95 px-4 py-4 backdrop-blur sm:px-5 lg:rounded-xl lg:border"
      aria-label={eyebrow}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-data-accent-foreground uppercase">{eyebrow}</p>
          <p className="mt-1 truncate text-base font-semibold">{title}</p>
          {description ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">{action}</div>
      </div>
    </aside>
  );
}
