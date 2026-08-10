export type AuthBypassEnvironment = {
  NODE_ENV?: string;
  DEV_AUTH_BYPASS_ENABLED?: string;
  DEV_AUTH_BYPASS_USER_ID?: string;
};

export function developmentAuthBypassUserId(environment: AuthBypassEnvironment) {
  if (environment.NODE_ENV !== "development" && environment.NODE_ENV !== "test") return null;
  if (environment.DEV_AUTH_BYPASS_ENABLED?.trim().toLowerCase() !== "true") return null;
  const userId = environment.DEV_AUTH_BYPASS_USER_ID?.trim();
  return userId || null;
}

export function isDevelopmentAuthBypassSession(session: { token: string }) {
  return session.token === "dev-auth-bypass";
}
