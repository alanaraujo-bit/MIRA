"use client";

export type Comparison = { current: number; previous: number; deltaPercent: number | null; direction: "up" | "down" | "flat" | "new" };
export type Breakdown = Comparison & { key: string; label: string; share: number };
export type SeriesPoint = { index: number; startsAt: number; current: number; previous: number };

export function Delta({ value, compact = false }: { value: Comparison; compact?: boolean }) {
  const label = value.direction === "new" ? "novo" : value.direction === "flat" ? "0%" : `${value.direction === "up" ? "+" : ""}${value.deltaPercent}%`;
  return <span className={`analytics-delta ${value.direction}`} title={`${value.previous.toLocaleString("pt-BR")} no período anterior`}>
    <i aria-hidden="true">{value.direction === "up" ? "↑" : value.direction === "down" ? "↓" : value.direction === "new" ? "•" : "→"}</i>{compact ? label : `${label} vs. anterior`}
  </span>;
}

export function TrafficBars({ series, days }: { series: SeriesPoint[]; days: number }) {
  const maximum = Math.max(1, ...series.flatMap((point) => [point.current, point.previous]));
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  return <div className={`traffic-bars days-${days}`} role="img" aria-label={`Cliques por intervalo nos últimos ${days} dias, comparados ao período anterior`}>
    {series.map((point) => <div className="traffic-bar-day" key={point.index} title={`${date.format(point.startsAt)}: ${point.current} atuais, ${point.previous} anteriores`}>
      <div className="traffic-bar-pair"><i className="previous" style={{ height: `${Math.max(point.previous ? 3 : 0, point.previous / maximum * 100)}%` }} /><i className="current" style={{ height: `${Math.max(point.current ? 3 : 0, point.current / maximum * 100)}%` }} /></div>
      {(days === 7 || point.index % (days === 30 ? 5 : 15) === 0) && <span>{date.format(point.startsAt).replace(" de ", " ")}</span>}
    </div>)}
  </div>;
}

export function BreakdownRows({ items, empty }: { items: Breakdown[]; empty: string }) {
  if (!items.length) return <div className="analytics-empty"><span>—</span><p>{empty}</p></div>;
  return <div className="breakdown-rows">{items.slice(0, 8).map((item) => <article key={item.key}>
    <div><strong>{item.label}</strong><small>{item.share}% do período</small></div><div className="share-track"><i style={{ width: `${item.share}%` }} /></div><strong>{item.current.toLocaleString("pt-BR")}</strong><Delta value={item} compact />
  </article>)}</div>;
}
