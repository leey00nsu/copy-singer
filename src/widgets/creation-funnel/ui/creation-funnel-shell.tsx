import type { ReactNode } from "react";
import type { CreationFunnelStep } from "../model/creation-funnel";
import { CreationFunnelStepper } from "./creation-funnel-stepper";

export function CreationFunnelShell({
  backAction,
  children,
  currentStep,
}: {
  backAction?: ReactNode;
  children: ReactNode;
  currentStep: CreationFunnelStep;
}) {
  return (
    <div className="mx-auto w-full max-w-[72rem] px-5 py-8 sm:px-7 lg:px-8 lg:py-10">
      {backAction ? <div className="mb-5">{backAction}</div> : null}
      <CreationFunnelStepper current={currentStep} />
      {children}
    </div>
  );
}
