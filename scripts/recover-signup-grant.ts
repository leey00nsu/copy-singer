import { parseArgs } from "node:util";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
const { values } = parseArgs({
  options: {
    user: { type: "string" },
    kind: { type: "string" },
    amount: { type: "string" },
    operator: { type: "string" },
    reason: { type: "string" },
    apply: { type: "boolean", default: false },
  },
});
const { prisma } = await import("../src/shared/db/index.server");
try {
  if (!values.user || !values.kind || values.amount === undefined || !values.operator || !values.reason) {
    throw new Error(
      "Required: --user ID --kind VOCAL_ANALYSIS|AI_MIXING --amount N --operator NAME --reason TEXT [--apply]",
    );
  }
  if (values.kind !== "VOCAL_ANALYSIS" && values.kind !== "AI_MIXING") throw new Error("Invalid ticket kind.");
  const { recoverSignupGrant } = await import("../src/entities/ticket/index.server");
  console.log(
    JSON.stringify(
      await recoverSignupGrant({
        userId: values.user,
        kind: values.kind,
        amount: Number(values.amount),
        operator: values.operator,
        reason: values.reason,
        apply: values.apply,
      }),
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Signup recovery failed.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
