"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import SignOutButton from "../sign-out-button";
import { BreakdownRows, Delta, TrafficBars, type Breakdown, type Comparison, type SeriesPoint } from "./analytics-ui";

type Workspace = { id: string; name: string; role: string };
type Report = {
  range: { days: number; startsAt: number; endsAt: number; previousStartsAt: number; previousEndsAt: number };
  metrics: { clicks: Comparison; activeLinks: number; linksWithTraffic: number; automatedClicks: number; automatedShare: number; lastEventAt: number | null };
  series: SeriesPoint[]; sources: Breakdown[]; devices: Breakdown[];
  topLinks: Array<Comparison & { id: string; title: string; slug: string; domainHostname: string | null }>;
  campaigns: Array<Comparison & { id: string | null; name: string }>;
  insights: Array<{ tone: "positive" | "attention" | "neutral"; title: string; detail: string }>;
  limitations: string[];
};

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Não foi possível carregar Analytics.");
  return payload;
}

export default function AnalyticsApp({ user }: { user: { displayName: string; email: string } }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async (workspaceId: string, period: number, initial = false) => {
    if (initial) setState("loading"); else setRefreshing(true);
    setError("");
    try {
      const data = await jsonRequest<{ report: Report }>(`/api/analytics/report?workspaceId=${encodeURIComponent(workspaceId)}&days=${period}`);
      setReport(data.report); setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha inesperada.");
      if (initial) setState("error");
    } finally { setRefreshing(false); }
  }, []);

  const load = useCallback(async () => {
    try {
      const boot = await jsonRequest<{ selected: Workspace }>("/api/bootstrap", { method: "POST", body: "{}" });
      setWorkspace(boot.selected);
      await loadReport(boot.selected.id, 7, true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha inesperada."); setState("error"); }
  }, [loadReport]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  function changePeriod(period: 7 | 30 | 90) {
    if (period === days) return;
    setDays(period);
    if (workspace) void loadReport(workspace.id, period);
  }

  const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
  return <div className="product-shell">
    <a className="skip-link" href="#analytics-main">Ir para o conteúdo</a>
    <aside className="product-sidebar"><Link className="brand" href="/" aria-label="Mira Roadmap"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Mira</span></Link><div className="workspace-switcher"><span>Workspace</span><strong>{workspace?.name ?? "Carregando…"}</strong><small>{workspace?.role ?? ""}</small></div><nav aria-label="Produto"><Link href="/product"><span aria-hidden="true">⌂</span>Visão geral</Link><Link href="/product#links"><span aria-hidden="true">↗</span>Links</Link><Link href="/product/campaigns"><span aria-hidden="true">◇</span>Campaigns</Link><Link href="/product/domains"><span aria-hidden="true">◎</span>Domínios</Link><Link className="selected" href="/product/analytics"><span aria-hidden="true">◌</span>Analytics</Link></nav><Link className="roadmap-return" href="/">Roadmap Live <span>↗</span></Link></aside>
    <main id="analytics-main" className="product-main">
      <header className="product-topbar"><div><span className="product-context">Analytics</span><strong>{workspace?.name ?? "Mira"}</strong></div><SignOutButton user={user} /></header>
      {state === "loading" && <section className="product-state" aria-live="polite"><i /><h1>Reconciliando eventos</h1><p>Comparando o período atual com a janela anterior equivalente.</p></section>}
      {state === "error" && <section className="product-state error" role="alert"><span>!</span><h1>Analytics não pôde ser carregado</h1><p>{error}</p><button className="button primary" onClick={() => void load()}>Tentar novamente</button></section>}
      {state === "ready" && report && <div className={`product-content analytics-content ${refreshing ? "is-refreshing" : ""}`}>
        <section className="analytics-intro"><div><span className="eyebrow">Superfície de decisão</span><h1>O que mudou no seu tráfego?</h1><p>Cada número compara janelas equivalentes e nasce dos eventos persistidos pela Mira — sem estimativas de visitantes que ainda não podemos provar.</p></div><div className="period-switch" role="group" aria-label="Período analítico">{([7, 30, 90] as const).map((period) => <button type="button" key={period} className={days === period ? "selected" : ""} aria-pressed={days === period} onClick={() => changePeriod(period)}>{period} dias</button>)}</div></section>
        {error && <div className="product-notice error" role="alert"><span>!</span><p>{error}</p><button onClick={() => setError("")} aria-label="Fechar aviso">×</button></div>}
        <section className="analytics-metrics" aria-label="Resumo de performance"><article className="primary"><span>Cliques</span><strong>{report.metrics.clicks.current.toLocaleString("pt-BR")}</strong><Delta value={report.metrics.clicks} /></article><article><span>Links com tráfego</span><strong>{report.metrics.linksWithTraffic}</strong><small>de {report.metrics.activeLinks} ativos</small></article><article><span>Automação conhecida</span><strong>{report.metrics.automatedShare}%</strong><small>{report.metrics.automatedClicks} eventos classificados</small></article><article><span>Último evento</span><strong className="metric-date">{report.metrics.lastEventAt ? dateTime.format(report.metrics.lastEventAt) : "—"}</strong><small>{report.metrics.lastEventAt ? "persistência confirmada" : "aguardando tráfego"}</small></article></section>
        <section className="analytics-panel traffic-panel"><header><div><span className="eyebrow">Evolução</span><h2>Período atual × anterior</h2></div><div className="chart-legend"><span><i className="current" />Atual</span><span><i className="previous" />Anterior</span></div></header><TrafficBars series={report.series} days={days} /><footer><span>{dateTime.format(report.range.startsAt)}</span><p>Intervalos móveis de 24 horas · comparação de mesma duração</p><span>{dateTime.format(report.range.endsAt)}</span></footer></section>
        <section className="insight-strip" aria-label="Leituras automáticas">{report.insights.map((insight) => <article className={insight.tone} key={insight.title}><span>{insight.tone === "positive" ? "↗" : insight.tone === "attention" ? "!" : "→"}</span><div><strong>{insight.title}</strong><p>{insight.detail}</p></div></article>)}</section>
        <div className="analytics-grid"><section className="analytics-panel"><header><div><span className="eyebrow">Aquisição</span><h2>Origens</h2></div><span>{report.sources.length} identificadas</span></header><BreakdownRows items={report.sources} empty="Os próximos cliques revelarão as origens disponíveis." /></section><section className="analytics-panel"><header><div><span className="eyebrow">Contexto</span><h2>Dispositivos</h2></div><span>classificação minimizada</span></header><BreakdownRows items={report.devices} empty="Ainda não existe amostra de dispositivo." /></section></div>
        <div className="analytics-grid ranking-grid"><section className="analytics-panel"><header><div><span className="eyebrow">Drill-down</span><h2>Links em destaque</h2></div><span>por cliques atuais</span></header>{report.topLinks.length ? <div className="analytics-ranking">{report.topLinks.map((item, index) => <Link href={`/product/links/${item.id}`} key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.title}</strong><small>{item.domainHostname ? `${item.domainHostname}/${item.slug}` : `/go/${item.slug}`}</small></div><b>{item.current.toLocaleString("pt-BR")}</b><Delta value={item} compact /></Link>)}</div> : <div className="analytics-empty"><span>↗</span><p>Distribua um Link para iniciar o ranking.</p></div>}</section><section className="analytics-panel"><header><div><span className="eyebrow">Portfólio</span><h2>Campaigns</h2></div><Link href="/product/campaigns">Abrir Campaigns</Link></header>{report.campaigns.length ? <div className="analytics-ranking">{report.campaigns.map((item, index) => <Link href={`/product/campaigns/${item.id}`} key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.name}</strong><small>performance consolidada</small></div><b>{item.current.toLocaleString("pt-BR")}</b><Delta value={item} compact /></Link>)}</div> : <div className="analytics-empty"><span>◇</span><p>Campanhas com tráfego aparecerão aqui.</p></div>}</section></div>
        <details className="analytics-method"><summary>Como ler estes dados</summary><div>{report.limitations.map((limitation) => <p key={limitation}>{limitation}</p>)}</div></details>
      </div>}
    </main>
  </div>;
}
