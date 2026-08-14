import { Check, Circle, CircleDot, LoaderCircle, Minus } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { lifecycleStatusClassNames } from "@/shared/lib/lifecycle-status-colors";
import type { ActualStateStep } from "../model/creation-funnel";

function StateIcon({ state }: Pick<ActualStateStep, "state">) {
  if (state === "complete") return <Check aria-hidden="true" className="size-4" />;
  if (state === "current") {
    return <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />;
  }
  if (state === "reached") return <CircleDot aria-hidden="true" className="size-4" />;
  if (state === "skipped") return <Minus aria-hidden="true" className="size-3.5" />;
  return <Circle aria-hidden="true" className="size-3" />;
}

export function ActualStateTimeline({ label, steps }: { label: string; steps: ActualStateStep[] }) {
  return (
    <ol aria-label={label} className="overflow-hidden rounded-2xl border bg-background text-left">
      {steps.map((step, index) => {
        const finalSuccess = step.state === "complete" && index === steps.length - 1;
        return (
          <li
            className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 px-5 py-4"
            data-state={step.state}
            key={step.id}
          >
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="absolute top-10 bottom-[-1rem] left-[2.45rem] w-px bg-border" />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 flex size-7 items-center justify-center rounded-full border bg-background",
                step.state === "complete" &&
                  (finalSuccess ? lifecycleStatusClassNames.success : lifecycleStatusClassNames.completed),
                step.state === "reached" && "border-foreground text-foreground",
                step.state === "current" && lifecycleStatusClassNames.active,
                step.state === "skipped" && "text-muted-foreground",
              )}
              data-lifecycle-marker="true"
            >
              <StateIcon state={step.state} />
            </span>
            <div className="border-b pb-4 last:border-b-0">
              <p className="text-sm font-semibold">{step.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
