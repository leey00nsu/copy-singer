import { Check, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export function ProcessHero({
  action,
  children,
  description,
  eyebrow,
  status,
  title,
  tone = "active",
}: {
  action?: ReactNode;
  children?: ReactNode;
  description: ReactNode;
  eyebrow: string;
  status?: ReactNode;
  title: ReactNode;
  tone?: "active" | "success" | "failure";
}) {
  return (
    <section
      aria-labelledby="creation-process-title"
      aria-live={tone === "failure" ? "assertive" : "polite"}
      className="mx-auto max-w-[48rem] py-10 text-center sm:py-14"
    >
      <p className="text-[11px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">{eyebrow}</p>
      <h1
        className="mx-auto mt-4 max-w-[42rem] text-3xl leading-tight font-semibold tracking-[-0.04em] sm:text-4xl"
        id="creation-process-title"
      >
        {title}
      </h1>
      <div className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{description}</div>

      <div className="mx-auto mt-7 grid aspect-square w-[min(22rem,78vw)] place-items-center" aria-hidden="true">
        {tone === "active" ? (
          <div className="relative grid size-full place-items-center">
            <span className="absolute inset-[8%] rounded-full border border-dashed border-data-accent/20" />
            <span className="absolute inset-[16%] rounded-full border border-dashed border-data-accent/15" />
            <span className="absolute inset-[24%] rounded-full border border-dashed border-data-accent/10" />
            <span className="relative block aspect-square w-[48%] overflow-hidden rounded-full bg-violet-50 shadow-[0_24px_60px_oklch(0.75_0.09_285/0.15)]">
              <span className="absolute -inset-1/3 animate-[spin_8s_linear_infinite] rounded-full bg-[conic-gradient(from_30deg,oklch(0.82_0.12_292/0.85),oklch(0.9_0.09_220/0.82),oklch(0.9_0.1_20/0.72),oklch(0.84_0.1_260/0.82),oklch(0.82_0.12_292/0.85))] blur-xl motion-reduce:animate-none" />
              <span className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_32%_28%,oklch(0.95_0.04_315/0.95),transparent_42%),radial-gradient(circle_at_68%_65%,oklch(0.9_0.08_230/0.9),transparent_48%),oklch(0.93_0.055_285)] blur-md" />
            </span>
          </div>
        ) : (
          <span
            className={cn(
              "flex size-32 items-center justify-center rounded-full border",
              tone === "success" && "border-success/50 bg-success/30 text-success-foreground",
              tone === "failure" && "border-destructive/30 bg-destructive/5 text-destructive",
            )}
          >
            {tone === "success" ? <Check className="size-12" /> : <TriangleAlert className="size-12" />}
          </span>
        )}
      </div>

      {status ? <div className="mt-1 flex justify-center">{status}</div> : null}
      {children ? <div className="mx-auto mt-8 max-w-[36rem]">{children}</div> : null}
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </section>
  );
}
