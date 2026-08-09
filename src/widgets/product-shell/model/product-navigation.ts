const productNavigation = [
  { href: "/profile", label: "목소리 분석", icon: "microphone" },
  { href: "/library", label: "라이브러리", icon: "library" },
] as const;

function isProductPathActive(pathname: string, href: string) {
  if (href === "/profile") return pathname === href;
  if (href === "/library") {
    return (
      pathname.startsWith(href) ||
      pathname.startsWith("/vocal-profiles") ||
      pathname.startsWith("/mixing-history") ||
      pathname.startsWith("/recommendations/")
    );
  }
  return pathname.startsWith(href);
}

export { isProductPathActive, productNavigation };
