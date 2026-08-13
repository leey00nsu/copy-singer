import type { Metadata } from "next";

const SITE_NAME = "Copy Singer";
const SITE_TITLE = "Copy Singer — 내 목소리에 맞는 노래";
const SITE_DESCRIPTION = "목소리를 분석해 어울리는 노래와 키를 찾고 AI 믹싱 결과를 만들어보세요.";
const SOCIAL_DESCRIPTION = "내 음역을 측정하고 어울리는 노래와 키를 찾아보세요.";

const PRIVATE_ROBOTS: Metadata["robots"] = {
  follow: false,
  index: false,
  googleBot: {
    follow: false,
    index: false,
  },
};

const PRIVATE_METADATA: Metadata = { robots: PRIVATE_ROBOTS };

function normalizeOrigin(candidate: string | undefined) {
  const value = candidate?.trim();
  if (!value) return undefined;

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
    ? value
    : `${value.startsWith("localhost") || value.startsWith("127.0.0.1") ? "http" : "https"}://${value}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return undefined;
  }
}

function resolveSiteOrigin({
  authURL,
  vercelProductionURL,
  vercelURL,
}: {
  authURL?: string;
  vercelProductionURL?: string;
  vercelURL?: string;
} = {}) {
  return (
    normalizeOrigin(authURL) ??
    normalizeOrigin(vercelProductionURL) ??
    normalizeOrigin(vercelURL) ??
    "http://localhost:3000"
  );
}

function getSiteOrigin() {
  return resolveSiteOrigin({
    authURL: process.env.BETTER_AUTH_URL,
    vercelProductionURL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    vercelURL: process.env.VERCEL_URL,
  });
}

function buildRootMetadata(origin = getSiteOrigin()): Metadata {
  return {
    applicationName: SITE_NAME,
    category: "music",
    description: SITE_DESCRIPTION,
    icons: {
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      icon: [{ url: "/favicon.png", sizes: "64x64", type: "image/png" }],
      shortcut: "/favicon.png",
    },
    metadataBase: new URL(origin),
    title: SITE_TITLE,
  };
}

function buildHomeMetadata(origin = getSiteOrigin()): Metadata {
  const canonicalURL = `${origin}/`;
  const socialImage = `${origin}/og.png`;

  return {
    alternates: { canonical: canonicalURL },
    description: SITE_DESCRIPTION,
    openGraph: {
      description: SOCIAL_DESCRIPTION,
      images: [
        {
          alt: "Copy Singer 브랜드 파형과 내 목소리에 맞는 노래 찾기",
          height: 630,
          url: socialImage,
          width: 1200,
        },
      ],
      locale: "ko_KR",
      siteName: SITE_NAME,
      title: SITE_TITLE,
      type: "website",
      url: canonicalURL,
    },
    robots: { follow: true, index: true },
    title: SITE_TITLE,
    twitter: {
      card: "summary_large_image",
      description: SOCIAL_DESCRIPTION,
      images: [{ alt: "Copy Singer 브랜드 파형", url: socialImage }],
      title: SITE_TITLE,
    },
  };
}

export {
  buildHomeMetadata,
  buildRootMetadata,
  getSiteOrigin,
  PRIVATE_METADATA,
  PRIVATE_ROBOTS,
  resolveSiteOrigin,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
};
