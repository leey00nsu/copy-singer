import "server-only";

export function devSvcEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_SVC?.trim().toLowerCase() === "true";
}

export function devSvcUnavailable() {
  return Response.json({ error: { code: "NOT_FOUND", message: "Not found." } }, { status: 404 });
}
