const productNavigation = [
  { href: "/profile", label: "목소리 분석", icon: "microphone" },
  { href: "/vocal-profiles", label: "보컬 프로필", icon: "profiles" },
  { href: "/mixing-history", label: "AI 믹스", icon: "history" },
] as const;

function isProductPathActive(pathname: string, href: string) {
  if (href === "/profile") return pathname === href;
  if (href === "/vocal-profiles") {
    return pathname.startsWith(href) || pathname.startsWith("/recommendations/");
  }
  return pathname.startsWith(href);
}

export { isProductPathActive, productNavigation };
