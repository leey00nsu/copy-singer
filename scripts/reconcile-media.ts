import { parseArgs } from "node:util";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
const { values } = parseArgs({
  options: {
    id: { type: "string" },
    operator: { type: "string" },
    reason: { type: "string" },
    "file-id": { type: "string" },
    apply: { type: "boolean", default: false },
  },
});
const { prisma } = await import("../src/shared/db/index.server");
try {
  if (!values.id) {
    console.log(
      JSON.stringify(
        await prisma.mediaOperation.findMany({
          where: { status: "UNRESOLVED" },
          take: 100,
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            operation: true,
            externalProjectId: true,
            externalFileId: true,
            lastError: true,
            createdAt: true,
          },
        }),
      ),
    );
  } else {
    if (!values.operator?.trim() || !values.reason?.trim()) throw new Error("--operator and --reason are required.");
    const intent = await prisma.mediaOperation.findUniqueOrThrow({ where: { id: values.id } });
    if (intent.status !== "UNRESOLVED") throw new Error("Only unresolved operations can be reconciled.");
    const action = values["file-id"] ? "SCHEDULE_KNOWN_IDENTITY_DELETE" : "RECORD_OPERATOR_RESOLUTION";
    console.log(JSON.stringify({ id: intent.id, action, apply: values.apply }));
    if (values.apply) {
      const updated = await prisma.mediaOperation.updateMany({
        where: { id: intent.id, status: "UNRESOLVED" },
        data: {
          status: values["file-id"] ? "RECOVER" : "RESOLVED_BY_OPERATOR",
          ...(values["file-id"]
            ? { externalFileId: values["file-id"], operation: "DELETE", nextAttemptAt: new Date(), attempts: 0 }
            : {}),
          resolution: `${values.operator}: ${values.reason}`,
        },
      });
      if (updated.count !== 1) throw new Error("Reconciliation conflict.");
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Reconciliation failed.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
