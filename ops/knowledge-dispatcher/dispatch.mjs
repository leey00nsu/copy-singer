import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const owner = "leey00nsu";
const repository = "copy-singer";
const workflow = "lee-spec-kit-knowledge.yml";
const title = (cycle) => `OpenWiki Knowledge ${cycle}`;

export function koreanCycle(now) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    due: Number(parts.hour) >= 1,
  };
}

export async function dispatchKnowledge({ now = new Date(), token, request = fetch } = {}) {
  const cycle = koreanCycle(now);
  if (!cycle.due) return { outcome: "before-due", cycle: cycle.date };
  if (!token) throw new Error("GH_ACTIONS_DISPATCH_TOKEN is missing");

  const base = `https://api.github.com/repos/${owner}/${repository}/actions/workflows/${workflow}`;
  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "user-agent": "copy-singer-knowledge-dispatcher",
  };
  const call = async (url, init = {}) => {
    const response = await request(url, { ...init, headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      let reason = "";
      try {
        const body = await response.json();
        if (typeof body.message === "string") reason = `: ${body.message.slice(0, 200)}`;
      } catch {
        // The HTTP status and request path still identify the failed operation.
      }
      const operation = `${init.method || "GET"} ${new URL(url).pathname}`;
      throw new Error(`GitHub Actions API ${operation} returned HTTP ${response.status}${reason}`);
    }
    if (response.status === 204) return null;
    return response.json();
  };
  const runs = await call(`${base}/runs?per_page=100`);
  if (!Array.isArray(runs.workflow_runs)) throw new Error("GitHub Actions API returned no run list");
  if (
    runs.workflow_runs.some(
      (run) => (run.event === "workflow_dispatch" || run.event === "schedule") && run.status !== "completed",
    )
  ) {
    return { outcome: "already-running", cycle: cycle.date };
  }
  if (runs.workflow_runs.some((run) => run.display_title === title(cycle.date))) {
    return { outcome: "already-dispatched", cycle: cycle.date };
  }

  const result = await call(`${base}/dispatches`, {
    method: "POST",
    body: JSON.stringify({ ref: "main", inputs: { cycle: cycle.date } }),
  });
  if (result === null) return { outcome: "accepted", cycle: cycle.date };
  if (!result.workflow_run_id || !result.html_url) {
    throw new Error("GitHub accepted the dispatch without returning a run ID");
  }
  return { outcome: "dispatched", cycle: cycle.date, runId: result.workflow_run_id, url: result.html_url };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes("--dispatch")) {
    try {
      const result = await dispatchKnowledge({ token: process.env.GH_ACTIONS_DISPATCH_TOKEN });
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } catch (error) {
      process.stderr.write(`Knowledge dispatch failed: ${error.message}\n`);
      process.exitCode = 1;
    }
  } else {
    http
      .createServer((_request, response) => {
        response.writeHead(200, { "content-type": "text/plain" });
        response.end("ok\n");
      })
      .listen(8080, "0.0.0.0");
  }
}
