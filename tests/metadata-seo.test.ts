import assert from "node:assert/strict";
import test from "node:test";

import { buildRobots, PRIVATE_PATHS } from "../src/_app/metadata/robots";
import { buildSitemap } from "../src/_app/metadata/sitemap";
import {
  buildHomeMetadata,
  buildRootMetadata,
  PRIVATE_METADATA,
  resolveSiteOrigin,
} from "../src/shared/config/site-metadata";

test("site origin prefers the auth canonical and normalizes deployment hostnames", () => {
  assert.equal(
    resolveSiteOrigin({ authURL: "https://copy-singer.example/app/", vercelProductionURL: "fallback.example" }),
    "https://copy-singer.example",
  );
  assert.equal(resolveSiteOrigin({ vercelProductionURL: "copy-singer.vercel.app" }), "https://copy-singer.vercel.app");
  assert.equal(resolveSiteOrigin({ authURL: "not a url" }), "http://localhost:3000");
});

test("root and home metadata expose icon, canonical, Open Graph and Twitter contracts", () => {
  const origin = "https://copy-singer.example";
  const root = buildRootMetadata(origin);
  const home = buildHomeMetadata(origin);

  assert.ok(root.metadataBase instanceof URL);
  assert.equal(root.metadataBase.origin, origin);
  assert.deepEqual(root.icons, {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    icon: [{ url: "/favicon.png", sizes: "64x64", type: "image/png" }],
    shortcut: "/favicon.png",
  });
  assert.equal(home.alternates?.canonical, `${origin}/`);
  assert.ok(home.openGraph && "type" in home.openGraph);
  assert.equal(home.openGraph.type, "website");
  assert.equal(home.openGraph.url, `${origin}/`);
  assert.equal(home.openGraph.siteName, "Copysinger");
  assert.equal(home.openGraph.locale, "ko_KR");
  assert.ok(home.twitter && "card" in home.twitter);
  assert.equal(home.twitter.card, "summary_large_image");
  assert.deepEqual(home.robots, { follow: true, index: true });
});

test("robots, sitemap and private metadata keep the public index boundary explicit", () => {
  const origin = "https://copy-singer.example";
  const robots = buildRobots(origin);
  const sitemap = buildSitemap(origin);

  assert.equal(robots.host, origin);
  assert.equal(robots.sitemap, `${origin}/sitemap.xml`);
  assert.deepEqual(robots.rules, {
    allow: ["/", "/terms", "/privacy"],
    disallow: PRIVATE_PATHS,
    userAgent: "*",
  });
  assert.deepEqual(
    sitemap.map(({ url }) => url),
    [`${origin}/`, `${origin}/terms`, `${origin}/privacy`],
  );
  assert.deepEqual(PRIVATE_METADATA.robots, {
    follow: false,
    googleBot: { follow: false, index: false },
    index: false,
  });
});
