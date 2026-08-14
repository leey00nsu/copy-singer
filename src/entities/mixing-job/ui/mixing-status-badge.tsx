import { AlertTriangle, CheckCircle2, LoaderCircle, XCircle } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { lifecycleStatusClassNames } from "@/shared/lib/lifecycle-status-colors";
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
  const variant = status === "failed" ? "destructive" : "secondary";

  return (
    <Badge
      aria-live={active ? "polite" : undefined}
      className={cn(
        "h-7 gap-1.5 px-2.5 text-[11px]",
        active && lifecycleStatusClassNames.active,
        status === "succeeded" && lifecycleStatusClassNames.success,
        className,
      )}
      data-mixing-status={status}
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
