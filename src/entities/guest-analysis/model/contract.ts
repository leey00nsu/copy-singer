export const GUEST_TRIAL_COOKIE = "copy-singer.guest-trial";
export const GUEST_TRIAL_COOKIE_SECONDS = 365 * 24 * 60 * 60;
export const GUEST_RESULT_RETENTION_MS = 24 * 60 * 60 * 1_000;

export type GuestAnalysisPolicy = {
  state: "available" | "used" | "full" | "processing";
  profileId: string | null;
};
