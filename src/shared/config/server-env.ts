import "server-only";

export function integerEnv(name: string, fallback: number, options: { min?: number; max?: number } = {}) {
  const raw = process.env[name]?.trim();
  const value = raw === undefined || raw === "" ? fallback : Number(raw);
  const min = options.min ?? Number.MIN_SAFE_INTEGER;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

export function signupVocalAnalysisTicketGrant() {
  return integerEnv("SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT", 5, { min: 0, max: 1_000 });
}

export function signupMixingTicketGrant() {
  return integerEnv("SIGNUP_MIXING_TICKET_GRANT", 1, { min: 0, max: 1_000 });
}

export function mixingTicketCost() {
  return integerEnv("MIXING_TICKET_COST", 1, { min: 0, max: 1_000 });
}

export function vocalProfileAnalysisTicketCost() {
  return integerEnv("VOCAL_PROFILE_ANALYSIS_TICKET_COST", 1, { min: 0, max: 1_000 });
}

export function vocalProfileMaxUserProfiles() {
  return integerEnv("VOCAL_PROFILE_MAX_USER_PROFILES", 3, { min: 1, max: 1_000 });
}

export function mixingWorkerConcurrency() {
  return integerEnv("MIXING_WORKER_CONCURRENCY", 1, { min: 1, max: 32 });
}

export function mixingMaxAttempts() {
  return integerEnv("MIXING_MAX_ATTEMPTS", 3, { min: 1, max: 20 });
}

export function mixingLeaseSeconds() {
  return integerEnv("MIXING_LEASE_SECONDS", 120, { min: 30, max: 3_600 });
}

export function mixingPollIntervalMs() {
  return integerEnv("MIXING_POLL_INTERVAL_MS", 5_000, { min: 100, max: 60_000 });
}

export function vocalProfileAnalysisWorkerConcurrency() {
  return integerEnv("VOCAL_PROFILE_ANALYSIS_WORKER_CONCURRENCY", 1, { min: 1, max: 16 });
}

export function vocalProfileAnalysisMaxAttempts() {
  return integerEnv("VOCAL_PROFILE_ANALYSIS_MAX_ATTEMPTS", 3, { min: 1, max: 10 });
}

export function vocalProfileAnalysisLeaseSeconds() {
  return integerEnv("VOCAL_PROFILE_ANALYSIS_LEASE_SECONDS", 300, { min: 180, max: 3_600 });
}

export function songAnalysisWorkerConcurrency() {
  return integerEnv("SONG_ANALYSIS_WORKER_CONCURRENCY", 1, { min: 1, max: 8 });
}

export function songAnalysisLeaseSeconds() {
  return integerEnv("SONG_ANALYSIS_LEASE_SECONDS", 300, { min: 180, max: 3_600 });
}

export function songAnalysisPollIntervalMs() {
  return integerEnv("SONG_ANALYSIS_POLL_INTERVAL_MS", 2_500, { min: 250, max: 30_000 });
}

export function songAnalysisModalConfig() {
  const url = process.env.SONG_ANALYSIS_MODAL_URL?.trim().replace(/\/$/, "");
  const apiKey = process.env.SONG_ANALYSIS_MODAL_API_KEY?.trim() || process.env.MODAL_API_KEY?.trim();
  return url && apiKey ? { url, apiKey } : null;
}

export function vocalProfileAnalyzerUrl() {
  const url = process.env.VOCAL_PROFILE_API_URL?.replace(/\/$/, "");
  return url || null;
}
