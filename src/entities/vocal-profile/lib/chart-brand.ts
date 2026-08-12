const VOCAL_CHART_FALLBACK = {
  violet: "oklch(0.74 0.12 293)",
  blue: "oklch(0.76 0.09 260)",
  pink: "oklch(0.78 0.08 330)",
} as const;

const VOCAL_CHART_COLOR = {
  context: "var(--chart-context, oklch(0.9 0 0))",
  violet: `var(--brand-chart-violet, ${VOCAL_CHART_FALLBACK.violet})`,
  blue: `var(--brand-chart-blue, ${VOCAL_CHART_FALLBACK.blue})`,
  pink: `var(--brand-chart-pink, ${VOCAL_CHART_FALLBACK.pink})`,
} as const;

const VOCAL_CHART_GRADIENT = `linear-gradient(90deg, ${VOCAL_CHART_COLOR.violet}, ${VOCAL_CHART_COLOR.blue} 50%, ${VOCAL_CHART_COLOR.pink})`;

export { VOCAL_CHART_COLOR, VOCAL_CHART_FALLBACK, VOCAL_CHART_GRADIENT };
