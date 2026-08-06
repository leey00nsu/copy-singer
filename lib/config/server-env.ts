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
