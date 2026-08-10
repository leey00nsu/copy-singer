import { Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { type CreationFunnelStep, creationFunnelSteps } from "../model/creation-funnel";

export function CreationFunnelStepper({ current }: { current: CreationFunnelStep }) {
  const currentIndex = creationFunnelSteps.findIndex((step) => step.id === current);

  return (
    <nav aria-label="생성 진행 단계">
      <ol className="grid grid-cols-3 border-y text-xs sm:text-sm">
        {creationFunnelSteps.map((step, index) => {
          const state = index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
          return (
            <li
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "relative flex min-w-0 items-center gap-2 px-2 py-3 sm:px-4",
                index > 0 && "border-l",
                state === "upcoming" && "text-muted-foreground",
              )}
              data-state={state}
              key={step.id}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                  state === "complete" && "border-foreground bg-foreground text-background",
                  state === "current" && "border-data-accent bg-data-accent text-white",
                )}
              >
                {state === "complete" ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span className="truncate font-medium">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
