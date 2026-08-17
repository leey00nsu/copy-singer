import { Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { lifecycleStatusClassNames } from "@/shared/lib/lifecycle-status-colors";

type FunnelStep<TStep extends string = string> = {
  id: TStep;
  label: string;
};

function FunnelStepper<TStep extends string>({
  ariaLabel = "진행 단계",
  current,
  steps,
}: {
  ariaLabel?: string;
  current: TStep;
  steps: readonly FunnelStep<TStep>[];
}) {
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <nav aria-label={ariaLabel}>
      <ol className="relative grid grid-cols-3 text-xs sm:text-sm">
        {steps.map((step, index) => {
          const state = index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
          return (
            <li
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "relative z-10 flex min-w-0 flex-col items-center gap-2 px-1 text-center",
                state === "upcoming" && "text-muted-foreground",
              )}
              data-state={state}
              key={step.id}
            >
              {index < steps.length - 1 ? (
                <span aria-hidden="true" className="absolute top-3 left-1/2 z-0 h-px w-full bg-border">
                  <span
                    className={cn(
                      "block h-full w-0 bg-foreground transition-[width] duration-500 motion-reduce:transition-none",
                      index < currentIndex && "w-full",
                    )}
                  />
                </span>
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background text-[10px] font-semibold transition-colors duration-300",
                  state === "complete" && lifecycleStatusClassNames.completed,
                  state === "current" && "border-data-accent bg-data-accent text-white",
                )}
                data-lifecycle-marker="true"
              >
                {state === "complete" ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span className="max-w-full truncate font-medium">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export type { FunnelStep };
export { FunnelStepper };
