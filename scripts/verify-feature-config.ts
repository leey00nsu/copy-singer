import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const required = [
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ADMIN_EMAILS",
  "LEEMAGE_API_KEY",
  "LEEMAGE_PROJECT_ID",
] as const;
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing feature environment variables: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("Auth, admin, and Leemage environment variables are configured.");
}

if (process.argv.includes("--leemage")) {
  if (missing.some((name) => name.startsWith("LEEMAGE_"))) {
    throw new Error("Configure Leemage variables before running the storage smoke test.");
  }
  const { createLeemageClient } = await import("../lib/leemage/client");
  const client = createLeemageClient();
  const stored = await client.uploadFile({
    fileName: `copy-singer-smoke-${crypto.randomUUID()}.txt`,
    mimeType: "text/plain",
    bytes: new TextEncoder().encode("copy-singer storage smoke test"),
  });
  try {
    console.log(`Leemage upload confirmed: ${stored.fileId}`);
  } finally {
    await client.deleteFile(stored.projectId, stored.fileId);
    console.log("Leemage smoke file deleted.");
  }
}
