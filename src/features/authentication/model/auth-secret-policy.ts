export type AuthSecretEnvironment = {
  NODE_ENV?: string;
  BETTER_AUTH_SECRET?: string;
};

const DEVELOPMENT_AUTH_SECRET = "copy-singer-local-development-secret-change-me";

export function resolveAuthSecret(environment: AuthSecretEnvironment) {
  const configured = environment.BETTER_AUTH_SECRET?.trim();
  if (configured) return configured;
  if (environment.NODE_ENV === "development" || environment.NODE_ENV === "test") return DEVELOPMENT_AUTH_SECRET;
  throw new Error("BETTER_AUTH_SECRET is required outside development and test.");
}
