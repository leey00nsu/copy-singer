import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/shared/config/site-metadata";

const PRIVATE_PATHS = [
  "/account",
  "/admin",
  "/api/",
  "/dev/",
  "/library",
  "/login",
  "/notifications",
  "/profile",
  "/recommendations/",
  "/vocal-profiles/",
];

function buildRobots(origin = getSiteOrigin()): MetadataRoute.Robots {
  return {
    host: origin,
    rules: {
      allow: ["/", "/terms", "/privacy"],
      disallow: PRIVATE_PATHS,
      userAgent: "*",
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}

export { buildRobots, buildRobots as robots, PRIVATE_PATHS };
