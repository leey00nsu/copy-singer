import { Check, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { VoiceOrb } from "@/shared/ui/voice-orb";

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
          <VoiceOrb hoverIntensity={0} hue={294} rotateOnHover={false} />
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
