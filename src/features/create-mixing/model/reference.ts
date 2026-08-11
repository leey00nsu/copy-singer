import {
  mixingReferenceCapability,
  type SynthesisReferenceContractVersion,
} from "@/entities/vocal-profile/index.model";

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
  const smartReady =
    input.smart?.userId === input.userId &&
    input.smart.kind === "SYNTHESIS_REFERENCE" &&
    input.smart.status === "READY";
  const sourceReady =
    input.source?.userId === input.userId && input.source.kind === "REFERENCE" && input.source.status === "READY";
  const capability = mixingReferenceCapability({ smartReady, sourceReady, contractVersion: input.contractVersion });
  if (!capability.available) return null;
  if (smartReady) return input.smart;
  if (sourceReady) return input.source;
  return null;
}
