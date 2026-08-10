import { AlertTriangle, CheckCircle2, LoaderCircle, XCircle } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { isActiveMixingStatus, MIXING_STATUS_LABELS } from "../lib/presentation";
import type { PublicMixingJobStatus } from "../model/contract";

export function MixingStatusBadge({
  className,
  label,
  status,
}: {
  className?: string;
  label?: string;
  status: PublicMixingJobStatus;
}) {
  const active = isActiveMixingStatus(status);
  const variant = status === "failed" ? "destructive" : status === "succeeded" ? "default" : "secondary";

  return (
    <Badge
      aria-live={active ? "polite" : undefined}
      className={cn(
        "h-7 gap-1.5 px-2.5 text-[11px]",
        active && "border border-data-accent/35 bg-data-accent/10 text-data-accent-foreground",
        className,
      )}
      variant={variant}
    >
      {active ? <LoaderCircle aria-hidden="true" className="size-3 animate-spin motion-reduce:animate-none" /> : null}
      {status === "succeeded" ? <CheckCircle2 aria-hidden="true" className="size-3" /> : null}
      {status === "failed" ? <AlertTriangle aria-hidden="true" className="size-3" /> : null}
      {status === "canceled" ? <XCircle aria-hidden="true" className="size-3" /> : null}
      {label ?? MIXING_STATUS_LABELS[status]}
    </Badge>
  );
}
