import { getLinkForMember, requireWorkspace, type LinkRow } from "./repository";
import { database } from "./postgres";
import { comparePeriods, type AnalyticsComparison } from "../lib/analytics-rules";

const DAY_MS = 86_400_000;
const allowedDays = new Set([7, 30, 90]);

type Comparison = AnalyticsComparison;
type Breakdown = Comparison & { key: string; label: string; share: number };
type SeriesPoint = { index: number; startsAt: number; current: number; previous: number };
type Insight = { tone: "positive" | "attention" | "neutral"; title: string; detail: string };

export type AnalyticsReport = {
  range: { days: number; startsAt: number; endsAt: number; previousStartsAt: number; previousEndsAt: number };
  metrics: {
    clicks: Comparison;
    sessions: Comparison;
    sessionCoverage: number;
    clicksPerSession: number;
    activeLinks: number;
    linksWithTraffic: number;
    automatedClicks: number;
    automatedShare: number;
    lastEventAt: number | null;
  };
  series: SeriesPoint[];
  sources: Breakdown[];
  devices: Breakdown[];
  topLinks: Array<Comparison & { id: string; title: string; slug: string; domainHostname: string | null }>;
  campaigns: Array<Comparison & { id: string | null; name: string }>;
  insights: Insight[];
  limitations: string[];
};

export type LinkAnalytics = {
  link: LinkRow;
  range: AnalyticsReport["range"];
  clicks: Comparison;
  sessions: Comparison;
  sessionCoverage: number;
  clicksPerSession: number;
  series: SeriesPoint[];
  sources: Breakdown[];
  devices: Breakdown[];
  recentEvents: Array<{ id: string; occurredAt: number; referrer: string; device: string }>;
};

function rangeFor(requestedDays: number, now = Date.now()) {
  const days = allowedDays.has(requestedDays) ? requestedDays : 7;
  const endsAt = now;
  const startsAt = endsAt - days * DAY_MS;
  const previousEndsAt = startsAt;
  const previousStartsAt = previousEndsAt - days * DAY_MS;
  return { days, startsAt, endsAt, previousStartsAt, previousEndsAt };
}

function sourceLabel(value: string): string {
  if (value === "direct") return "Direto";
  if (/(^|\.)instagram\.com$/.test(value)) return "Instagram";
  if (/(^|\.)(facebook|fb)\.com$/.test(value)) return "Facebook";
  if (/(^|\.)linkedin\.com$/.test(value)) return "LinkedIn";
  if (/(^|\.)tiktok\.com$/.test(value)) return "TikTok";
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(value)) return "YouTube";
  if (/(^|\.)(google\.[a-z.]+|bing\.com)$/.test(value)) return "Busca";
  return value;
}

function deviceLabel(value: string): string {
  return ({ mobile: "Mobile", desktop: "Desktop", bot: "Automação conhecida", unknown: "Não identificado" } as Record<string, string>)[value] ?? value;
}

function hydrateBreakdown(rows: Array<{ key: string; current: number; previous: number }>, label: (key: string) => string): Breakdown[] {
  const total = rows.reduce((sum, row) => sum + Number(row.current), 0);
  return rows.map((row) => ({ key: row.key, label: label(row.key), share: total ? Math.round(Number(row.current) / total * 1000) / 10 : 0,
    ...comparePeriods(Number(row.current), Number(row.previous)) })).sort((a, b) => b.current - a.current || b.previous - a.previous || a.label.localeCompare(b.label));
}

function emptySeries(range: ReturnType<typeof rangeFor>): SeriesPoint[] {
  return Array.from({ length: range.days }, (_, index) => ({ index, startsAt: range.startsAt + index * DAY_MS, current: 0, previous: 0 }));
}

async function seriesFor(workspaceId: string, range: ReturnType<typeof rangeFor>, linkId?: string): Promise<SeriesPoint[]> {
  const linkClause = linkId ? "AND link_id = ?" : "";
  const bindings = linkId ? [workspaceId, range.previousStartsAt, range.endsAt, linkId] : [workspaceId, range.previousStartsAt, range.endsAt];
  const result = await database().prepare(`SELECT
    CASE WHEN occurred_at >= ${range.startsAt} THEN 'current' ELSE 'previous' END AS period,
    CAST((occurred_at - CASE WHEN occurred_at >= ${range.startsAt} THEN ${range.startsAt} ELSE ${range.previousStartsAt} END) / ${DAY_MS} AS INTEGER) AS bucket,
    COUNT(*) AS total FROM click_events WHERE workspace_id = ? AND occurred_at >= ? AND occurred_at < ? ${linkClause}
    GROUP BY period, bucket ORDER BY period, bucket`).bind(...bindings).all<{ period: "current" | "previous"; bucket: number; total: number }>();
  const series = emptySeries(range);
  for (const row of result.results) {
    const bucket = Number(row.bucket);
    if (bucket >= 0 && bucket < series.length) series[bucket][row.period] = Number(row.total);
  }
  return series;
}

async function breakdownFor(workspaceId: string, range: ReturnType<typeof rangeFor>, column: "device_class" | "referrer_host", linkId?: string): Promise<Array<{ key: string; current: number; previous: number }>> {
  const keySql = column === "referrer_host" ? "COALESCE(NULLIF(referrer_host, ''), 'direct')" : column;
  const linkClause = linkId ? "AND link_id = ?" : "";
  const bindings = linkId ? [range.startsAt, range.startsAt, workspaceId, range.previousStartsAt, range.endsAt, linkId]
    : [range.startsAt, range.startsAt, workspaceId, range.previousStartsAt, range.endsAt];
  const result = await database().prepare(`SELECT ${keySql} AS key,
    SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS current,
    SUM(CASE WHEN occurred_at < ? THEN 1 ELSE 0 END) AS previous
    FROM click_events WHERE workspace_id = ? AND occurred_at >= ? AND occurred_at < ? ${linkClause}
    GROUP BY ${keySql}`).bind(...bindings).all<{ key: string; current: number; previous: number }>();
  return result.results.map((row) => ({ key: row.key, current: Number(row.current), previous: Number(row.previous) }));
}

function buildInsights(report: Omit<AnalyticsReport, "insights" | "limitations">): Insight[] {
  const insights: Insight[] = [];
  const clicks = report.metrics.clicks;
  if (clicks.previous === 0 && clicks.current > 0) insights.push({ tone: "positive", title: "Primeira base comparável em formação", detail: `${clicks.current} cliques chegaram no período atual; o próximo período permitirá uma comparação proporcional.` });
  else if (clicks.direction === "up") insights.push({ tone: "positive", title: "Tráfego em crescimento", detail: `Cliques cresceram ${clicks.deltaPercent}% contra o período anterior equivalente.` });
  else if (clicks.direction === "down") insights.push({ tone: "attention", title: "Queda de tráfego", detail: `Cliques recuaram ${Math.abs(clicks.deltaPercent ?? 0)}% contra o período anterior equivalente.` });
  else insights.push({ tone: "neutral", title: "Tráfego estável", detail: "O volume de cliques ficou no mesmo nível do período anterior equivalente." });
  if (report.metrics.automatedShare >= 10) insights.push({ tone: "attention", title: "Automação acima do esperado", detail: `${report.metrics.automatedShare}% dos cliques foram classificados como automação conhecida.` });
  if (report.metrics.sessions.current) insights.push({ tone: "neutral", title: `${report.metrics.clicksPerSession} cliques por sessão observada`,
    detail: `A cobertura de sessão alcançou ${report.metrics.sessionCoverage}% dos cliques; GPC e DNT permanecem fora desta contagem.` });
  const source = report.sources[0];
  if (source?.current) insights.push({ tone: "neutral", title: `${source.label} lidera a origem`, detail: `${source.share}% dos cliques atribuíveis do período vieram desta origem.` });
  const device = report.devices.find((item) => item.key !== "bot");
  if (device?.current) insights.push({ tone: "neutral", title: `${device.label} concentra o tráfego`, detail: `${device.share}% dos eventos classificados pertencem a esta classe de dispositivo.` });
  return insights.slice(0, 4);
}

export async function workspaceAnalytics(userId: string, workspaceId: string, requestedDays: number): Promise<AnalyticsReport> {
  await requireWorkspace(userId, workspaceId);
  const range = rangeFor(requestedDays);
  const d1 = database();
  const [overview, activeLinks, linksWithTraffic, devicesRaw, sourcesRaw, series, topLinks, campaigns] = await Promise.all([
    d1.prepare(`SELECT SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS current,
      SUM(CASE WHEN occurred_at < ? THEN 1 ELSE 0 END) AS previous,
      SUM(CASE WHEN occurred_at >= ? AND device_class = 'bot' THEN 1 ELSE 0 END) AS automated,
      COUNT(DISTINCT CASE WHEN occurred_at >= ? THEN session_id_hash END) AS current_sessions,
      COUNT(DISTINCT CASE WHEN occurred_at < ? THEN session_id_hash END) AS previous_sessions,
      SUM(CASE WHEN occurred_at >= ? AND session_id_hash IS NOT NULL THEN 1 ELSE 0 END) AS session_attributed,
      MAX(occurred_at) AS last_event_at FROM click_events
      WHERE workspace_id = ? AND occurred_at >= ? AND occurred_at < ?`)
      .bind(range.startsAt, range.startsAt, range.startsAt, range.startsAt, range.startsAt, range.startsAt,
        workspaceId, range.previousStartsAt, range.endsAt)
      .first<{ current: number; previous: number; automated: number; current_sessions: number; previous_sessions: number;
        session_attributed: number; last_event_at: number | null }>(),
    d1.prepare("SELECT COUNT(*) AS total FROM links WHERE workspace_id = ? AND status = 'active'").bind(workspaceId).first<{ total: number }>(),
    d1.prepare("SELECT COUNT(DISTINCT link_id) AS total FROM click_events WHERE workspace_id = ? AND occurred_at >= ? AND occurred_at < ?")
      .bind(workspaceId, range.startsAt, range.endsAt).first<{ total: number }>(),
    breakdownFor(workspaceId, range, "device_class"),
    breakdownFor(workspaceId, range, "referrer_host"),
    seriesFor(workspaceId, range),
    d1.prepare(`SELECT l.id, l.title, l.slug, d.hostname AS domain_hostname,
      SUM(CASE WHEN ce.occurred_at >= ? THEN 1 ELSE 0 END) AS current,
      SUM(CASE WHEN ce.occurred_at < ? THEN 1 ELSE 0 END) AS previous
      FROM links l LEFT JOIN domains d ON d.id = l.domain_id
      LEFT JOIN click_events ce ON ce.link_id = l.id AND ce.occurred_at >= ? AND ce.occurred_at < ?
      WHERE l.workspace_id = ? GROUP BY l.id, d.hostname
      HAVING SUM(CASE WHEN ce.occurred_at >= ? THEN 1 ELSE 0 END) > 0 OR SUM(CASE WHEN ce.occurred_at < ? THEN 1 ELSE 0 END) > 0
      ORDER BY current DESC, previous DESC, l.updated_at DESC LIMIT 10`)
      .bind(range.startsAt, range.startsAt, range.previousStartsAt, range.endsAt, workspaceId, range.startsAt, range.startsAt)
      .all<{ id: string; title: string; slug: string; domain_hostname: string | null; current: number; previous: number }>(),
    d1.prepare(`SELECT c.id, c.name,
      SUM(CASE WHEN ce.occurred_at >= ? THEN 1 ELSE 0 END) AS current,
      SUM(CASE WHEN ce.occurred_at < ? THEN 1 ELSE 0 END) AS previous
      FROM campaigns c LEFT JOIN links l ON l.campaign_id = c.id
      LEFT JOIN click_events ce ON ce.link_id = l.id AND ce.occurred_at >= ? AND ce.occurred_at < ?
      WHERE c.workspace_id = ? GROUP BY c.id
      HAVING SUM(CASE WHEN ce.occurred_at >= ? THEN 1 ELSE 0 END) > 0 OR SUM(CASE WHEN ce.occurred_at < ? THEN 1 ELSE 0 END) > 0
      ORDER BY current DESC, previous DESC, c.updated_at DESC LIMIT 10`)
      .bind(range.startsAt, range.startsAt, range.previousStartsAt, range.endsAt, workspaceId, range.startsAt, range.startsAt)
      .all<{ id: string; name: string; current: number; previous: number }>(),
  ]);
  const clicks = comparePeriods(Number(overview?.current ?? 0), Number(overview?.previous ?? 0));
  const sessions = comparePeriods(Number(overview?.current_sessions ?? 0), Number(overview?.previous_sessions ?? 0));
  const sessionAttributed = Number(overview?.session_attributed ?? 0);
  const sources = hydrateBreakdown(sourcesRaw, sourceLabel);
  const devices = hydrateBreakdown(devicesRaw, deviceLabel);
  const automatedClicks = Number(overview?.automated ?? 0);
  const partial = {
    range,
    metrics: { clicks, sessions, sessionCoverage: clicks.current ? Math.round(sessionAttributed / clicks.current * 1000) / 10 : 0,
      clicksPerSession: sessions.current ? Math.round(sessionAttributed / sessions.current * 10) / 10 : 0,
      activeLinks: Number(activeLinks?.total ?? 0), linksWithTraffic: Number(linksWithTraffic?.total ?? 0),
      automatedClicks, automatedShare: clicks.current ? Math.round(automatedClicks / clicks.current * 1000) / 10 : 0,
      lastEventAt: overview?.last_event_at ? Number(overview.last_event_at) : null },
    series, sources, devices,
    topLinks: topLinks.results.map((row) => ({ id: row.id, title: row.title, slug: row.slug, domainHostname: row.domain_hostname,
      ...comparePeriods(Number(row.current), Number(row.previous)) })),
    campaigns: campaigns.results.map((row) => ({ id: row.id, name: row.name, ...comparePeriods(Number(row.current), Number(row.previous)) })),
  };
  return { ...partial, insights: buildInsights(partial), limitations: [
    "Cliques representam eventos registrados; visitantes únicos ainda não são inferidos.",
    "Sessões observadas usam um identificador first-party opaco por 30 minutos; GPC e DNT são respeitados e reduzem a cobertura.",
    "Sessões não equivalem a visitantes únicos e podem reiniciar por navegador, domínio, bloqueio ou expiração do cookie.",
    "Origem depende do referrer enviado pelo navegador e pode aparecer como Direto.",
    "Automação conhecida usa sinais do user-agent minimizado; não equivale a detecção completa de fraude.",
  ] };
}

export async function linkAnalytics(userId: string, linkId: string, requestedDays: number): Promise<LinkAnalytics> {
  const link = await getLinkForMember(userId, linkId);
  const range = rangeFor(requestedDays);
  const d1 = database();
  const [overview, series, sourcesRaw, devicesRaw, recent] = await Promise.all([
    d1.prepare(`SELECT SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS current,
      SUM(CASE WHEN occurred_at < ? THEN 1 ELSE 0 END) AS previous,
      COUNT(DISTINCT CASE WHEN occurred_at >= ? THEN session_id_hash END) AS current_sessions,
      COUNT(DISTINCT CASE WHEN occurred_at < ? THEN session_id_hash END) AS previous_sessions,
      SUM(CASE WHEN occurred_at >= ? AND session_id_hash IS NOT NULL THEN 1 ELSE 0 END) AS session_attributed FROM click_events
      WHERE workspace_id = ? AND link_id = ? AND occurred_at >= ? AND occurred_at < ?`)
      .bind(range.startsAt, range.startsAt, range.startsAt, range.startsAt, range.startsAt,
        link.workspace_id, link.id, range.previousStartsAt, range.endsAt)
      .first<{ current: number; previous: number; current_sessions: number; previous_sessions: number; session_attributed: number }>(),
    seriesFor(link.workspace_id, range, link.id),
    breakdownFor(link.workspace_id, range, "referrer_host", link.id),
    breakdownFor(link.workspace_id, range, "device_class", link.id),
    d1.prepare(`SELECT id, occurred_at, COALESCE(NULLIF(referrer_host, ''), 'direct') AS referrer, device_class
      FROM click_events WHERE workspace_id = ? AND link_id = ? ORDER BY occurred_at DESC LIMIT 25`)
      .bind(link.workspace_id, link.id).all<{ id: string; occurred_at: number; referrer: string; device_class: string }>(),
  ]);
  const clicks = comparePeriods(Number(overview?.current ?? 0), Number(overview?.previous ?? 0));
  const sessions = comparePeriods(Number(overview?.current_sessions ?? 0), Number(overview?.previous_sessions ?? 0));
  const sessionAttributed = Number(overview?.session_attributed ?? 0);
  return { link, range, clicks, sessions, sessionCoverage: clicks.current ? Math.round(sessionAttributed / clicks.current * 1000) / 10 : 0,
    clicksPerSession: sessions.current ? Math.round(sessionAttributed / sessions.current * 10) / 10 : 0, series,
    sources: hydrateBreakdown(sourcesRaw, sourceLabel), devices: hydrateBreakdown(devicesRaw, deviceLabel),
    recentEvents: recent.results.map((row) => ({ id: row.id, occurredAt: Number(row.occurred_at), referrer: sourceLabel(row.referrer), device: deviceLabel(row.device_class) })) };
}
