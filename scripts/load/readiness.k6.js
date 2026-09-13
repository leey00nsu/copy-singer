/* global __ENV, __ITER, __VU */
import { check } from "k6";
import http from "k6/http";
import { Rate } from "k6/metrics";

const base = __ENV.BASE_URL || "http://127.0.0.1:3000";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))
  throw new Error("Only an isolated localhost target is allowed.");
if (__ENV.CONFIRM_ISOLATED !== "yes")
  throw new Error("Set CONFIRM_ISOLATED=yes after verifying the server uses an isolated DB.");
const cookies = JSON.parse(__ENV.COOKIES_JSON || "[]");
if (!Array.isArray(cookies) || cookies.length === 0 || cookies.some((value) => typeof value !== "string"))
  throw new Error("COOKIES_JSON must contain test-account Cookie header values.");
const scenario = __ENV.SCENARIO || "10";
if (!["10", "50", "100", "burst"].includes(scenario)) throw new Error("SCENARIO must be 10, 50, 100, or burst.");
export const options = {
  scenarios:
    scenario === "burst"
      ? {
          burst: { executor: "shared-iterations", vus: 100, iterations: 500, maxDuration: "30s" },
        }
      : {
          steady: {
            executor: "constant-arrival-rate",
            rate: Number(scenario),
            timeUnit: "1s",
            duration: "60s",
            preAllocatedVUs: 30,
            maxVUs: 150,
          },
        },
  thresholds: { checks: ["rate>0.99"], http_req_duration: ["p(95)<2000"] },
};
const admitted = new Rate("admitted_200");
const limited = new Rate("limited_429");
const capacity = new Rate("capacity_503");

export default function () {
  const paths = [
    "/api/account/ticket-balance",
    "/api/notifications",
    "/api/vocal-profiles?page=1",
    "/api/mixing-jobs?page=1",
  ];
  const path = paths[__ITER % paths.length];
  const response = http.get(`${base}${path}`, {
    headers: { Cookie: cookies[(__VU - 1) % cookies.length] },
    redirects: 0,
    timeout: "5s",
    tags: { endpoint: path.split("?")[0] },
  });
  admitted.add(response.status === 200);
  limited.add(response.status === 429);
  capacity.add(response.status === 503);
  check(response, {
    "success or explicit backpressure": (r) =>
      r.status === 200 || ([429, 503].includes(r.status) && Number(r.headers["Retry-After"]) > 0),
  });
}
