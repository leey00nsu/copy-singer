import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/cn";

type AdminMetric = {
  detail: string;
  icon: LucideIcon;
  label: string;
  value: number;
};

function AdminMetricBand({ className, metrics }: { className?: string; metrics: AdminMetric[] }) {
  return (
    <section
      aria-label="운영 요약"
      className={cn("grid gap-2 rounded-2xl bg-muted/25 p-2 sm:grid-cols-2 xl:grid-cols-4", className)}
    >
      {metrics.map(({ detail, icon: Icon, label, value }) => (
        <article className="min-w-0 rounded-xl bg-background/72 p-5" key={label}>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <Icon aria-hidden="true" className="size-4 text-data-accent" />
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] tabular-nums">{value}</p>
          <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{detail}</p>
        </article>
      ))}
    </section>
  );
}

export type { AdminMetric };
export { AdminMetricBand };
