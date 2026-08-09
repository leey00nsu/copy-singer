const CALLBACK_BASE = "https://copy-singer.invalid";

function safeCallbackURL(value: string | string[] | undefined, fallback = "/profile") {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate?.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return fallback;

  try {
    const parsed = new URL(candidate, CALLBACK_BASE);
    if (parsed.origin !== CALLBACK_BASE) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export { safeCallbackURL };
