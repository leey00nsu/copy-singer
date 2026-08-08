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

export function signupTicketGrant() {
  return integerEnv("SIGNUP_TICKET_GRANT", 1, { min: 0, max: 1_000 });
}

export function mixingTicketCost() {
  return integerEnv("MIXING_TICKET_COST", 1, { min: 0, max: 1_000 });
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
