export type AnalyticsComparison = {
  current: number;
  previous: number;
  deltaPercent: number | null;
  direction: "up" | "down" | "flat" | "new";
};

export function comparePeriods(currentValue: number, previousValue: number): AnalyticsComparison {
  const current = Number(currentValue) || 0;
  const previous = Number(previousValue) || 0;
  if (current === previous) return { current, previous, deltaPercent: 0, direction: "flat" };
  if (previous === 0) return { current, previous, deltaPercent: null, direction: "new" };
  const deltaPercent = Math.round(((current - previous) / previous) * 1000) / 10;
  return { current, previous, deltaPercent, direction: current > previous ? "up" : "down" };
}
