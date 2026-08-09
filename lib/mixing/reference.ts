import { SMART_REFERENCE_MID_VERSION, type SynthesisReferenceContractVersion } from "@/entities/vocal-profile";

type ReferenceCandidate = {
  userId: string;
  kind: "REFERENCE" | "SYNTHESIS_REFERENCE" | string;
  status: "READY" | string;
};

export function selectMixingReference<T extends ReferenceCandidate>(input: {
  userId: string;
  smart: T | null;
  source: T | null;
  contractVersion?: SynthesisReferenceContractVersion | null;
}) {
  if (
    input.smart?.userId === input.userId &&
    input.smart.kind === "SYNTHESIS_REFERENCE" &&
    input.smart.status === "READY"
  ) {
    return input.smart;
  }
  if (input.contractVersion === SMART_REFERENCE_MID_VERSION) return null;
  if (input.source?.userId === input.userId && input.source.kind === "REFERENCE" && input.source.status === "READY") {
    return input.source;
  }
  return null;
}
