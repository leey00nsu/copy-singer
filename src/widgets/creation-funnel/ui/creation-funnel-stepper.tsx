import { FunnelStepper } from "@/shared/ui/funnel-stepper";
import { type CreationFunnelStep, creationFunnelSteps } from "../model/creation-funnel";

export function CreationFunnelStepper({ current }: { current: CreationFunnelStep }) {
  return <FunnelStepper ariaLabel="생성 진행 단계" current={current} steps={creationFunnelSteps} />;
}
