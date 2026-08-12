const VOCAL_CHART_FALLBACK = {
  violet: "oklch(0.68 0.17 293)",
  blue: "oklch(0.7 0.13 260)",
  pink: "oklch(0.72 0.12 330)",
} as const;

const VOCAL_CHART_COLOR = {
  violet: `var(--brand-chart-violet, ${VOCAL_CHART_FALLBACK.violet})`,
  blue: `var(--brand-chart-blue, ${VOCAL_CHART_FALLBACK.blue})`,
  pink: `var(--brand-chart-pink, ${VOCAL_CHART_FALLBACK.pink})`,
} as const;

const VOCAL_CHART_GRADIENT = `linear-gradient(90deg, ${VOCAL_CHART_COLOR.violet}, ${VOCAL_CHART_COLOR.blue} 50%, ${VOCAL_CHART_COLOR.pink})`;

export { VOCAL_CHART_COLOR, VOCAL_CHART_FALLBACK, VOCAL_CHART_GRADIENT };
