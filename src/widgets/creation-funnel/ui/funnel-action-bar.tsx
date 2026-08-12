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
      className="rounded-xl border border-border/65 bg-background/88 px-4 py-4 shadow-[0_18px_48px_-34px_oklch(0.18_0.02_285/0.45)] backdrop-blur-xl sm:px-5"
      aria-label={eyebrow}
      data-surface="floating-action"
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
