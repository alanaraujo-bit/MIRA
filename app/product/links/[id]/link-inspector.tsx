"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BreakdownRows, Delta, TrafficBars, type Breakdown, type Comparison, type SeriesPoint } from "../../analytics/analytics-ui";
import SignOutButton from "../../sign-out-button";

type Workspace = { id: string; name: string; role: string };
type LinkItem = {
  id: string; title: string; destination_url: string; slug: string; status: "active" | "archived" | "blocked";
  domain_hostname: string | null; campaign_id: string | null; campaign_name: string | null; channel: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null; utm_term: string | null;
  tags: string[]; created_at: number; updated_at: number; clicks: number;
};
type Analytics = { link: LinkItem; range: { days: number; startsAt: number; endsAt: number }; clicks: Comparison; sessions: Comparison;
  sessionCoverage: number; clicksPerSession: number; series: SeriesPoint[];
  sources: Breakdown[]; devices: Breakdown[]; recentEvents: Array<{ id: string; occurredAt: number; referrer: string; device: string }> };

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Não foi possível abrir o Link.");
  return payload;
}

export default function LinkInspector({ linkId, user }: { linkId: string; user: { displayName: string; email: string } }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadAnalytics = useCallback(async (period: number, initial = false) => {
    if (initial) setState("loading"); else setRefreshing(true);
    setError("");
    try {
      const data = await jsonRequest<{ analytics: Analytics }>(`/api/analytics/links/${encodeURIComponent(linkId)}?days=${period}`);
      setAnalytics(data.analytics); setState("ready");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha inesperada."); if (initial) setState("error"); }
    finally { setRefreshing(false); }
  }, [linkId]);

  const load = useCallback(async () => {
    try {
      const [boot] = await Promise.all([jsonRequest<{ selected: Workspace }>("/api/bootstrap", { method: "POST", body: "{}" }), loadAnalytics(7, true)]);
      setWorkspace(boot.selected);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha inesperada."); setState("error"); }
  }, [loadAnalytics]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  function changePeriod(period: 7 | 30 | 90) { if (period === days) return; setDays(period); void loadAnalytics(period); }

  async function copyAddress() {
    if (!analytics) return;
    const address = analytics.link.domain_hostname ? `https://${analytics.link.domain_hostname}/${analytics.link.slug}` : `${window.location.origin}/go/${analytics.link.slug}`;
    try { await navigator.clipboard.writeText(address); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    catch { setError("O navegador bloqueou a cópia do endereço."); }
  }

  const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const link = analytics?.link;
  return <div className="product-shell">
    <a className="skip-link" href="#link-inspector-main">Ir para o conteúdo</a>
    <aside className="product-sidebar"><Link className="brand" href="/" aria-label="Mira Roadmap"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Mira</span></Link><div className="workspace-switcher"><span>Workspace</span><strong>{workspace?.name ?? "Carregando…"}</strong><small>{workspace?.role ?? ""}</small></div><nav aria-label="Produto"><Link href="/product"><span aria-hidden="true">⌂</span>Visão geral</Link><Link className="selected" href="/product#links"><span aria-hidden="true">↗</span>Links</Link><Link href="/product/campaigns"><span aria-hidden="true">◇</span>Campaigns</Link><Link href="/product/domains"><span aria-hidden="true">◎</span>Domínios</Link><Link href="/product/analytics"><span aria-hidden="true">◌</span>Analytics</Link></nav><Link className="roadmap-return" href="/">Roadmap Live <span>↗</span></Link></aside>
    <main id="link-inspector-main" className="product-main">
      <header className="product-topbar"><div><span className="product-context">Link Inspector</span><strong>{workspace?.name ?? "Mira"}</strong></div><SignOutButton user={user} /></header>
      {state === "loading" && <section className="product-state" aria-live="polite"><i /><h1>Lendo o Link</h1><p>Reconciliando configuração, tráfego e contexto.</p></section>}
      {state === "error" && <section className="product-state error" role="alert"><span>!</span><h1>Link indisponível</h1><p>{error}</p><button className="button primary" onClick={() => void load()}>Tentar novamente</button></section>}
      {state === "ready" && analytics && link && <div className={`product-content inspector-content link-inspector-content ${refreshing ? "is-refreshing" : ""}`}>
        <nav className="breadcrumb" aria-label="Navegação estrutural"><Link href="/product#links">Links</Link><span>/</span><span>{link.title}</span></nav>
        <section className="link-inspector-head"><div><span className={`domain-state ${link.status === "active" ? "verified" : "mismatch"}`}>{link.status === "active" ? "Link ativo" : link.status === "archived" ? "Arquivado" : "Bloqueado"}</span><h1>{link.title}</h1><button type="button" className="inspector-address" onClick={() => void copyAddress()}><span>{link.domain_hostname ? `${link.domain_hostname}/${link.slug}` : `/go/${link.slug}`}</span><b>{copied ? "Copiado" : "Copiar"}</b></button></div><div className="inspector-head-actions"><a className="button quiet" href={link.destination_url} target="_blank" rel="noreferrer">Abrir destino <span>↗</span></a><a className="button quiet" href={`/api/links/${encodeURIComponent(link.id)}/qr?download=1`}>Exportar QR</a></div></section>
        {error && <div className="product-notice error" role="alert"><span>!</span><p>{error}</p><button onClick={() => setError("")} aria-label="Fechar aviso">×</button></div>}
        <section className="link-inspector-metrics"><article><span>Cliques · {days} dias</span><strong>{analytics.clicks.current.toLocaleString("pt-BR")}</strong><Delta value={analytics.clicks} /></article><article><span>Sessões observadas</span><strong>{analytics.sessions.current.toLocaleString("pt-BR")}</strong><Delta value={analytics.sessions} /><small>{analytics.sessionCoverage}% de cobertura · {analytics.clicksPerSession} cliques/sessão</small></article><article><span>Total histórico</span><strong>{link.clicks.toLocaleString("pt-BR")}</strong><small>eventos persistidos</small></article><article><span>Última alteração</span><strong className="metric-date">{dateTime.format(link.updated_at)}</strong><small>controle de concorrência ativo</small></article></section>
        <section className="analytics-panel traffic-panel"><header><div><span className="eyebrow">Performance</span><h2>Evolução do Link</h2></div><div className="period-switch" role="group" aria-label="Período do Link">{([7, 30, 90] as const).map((period) => <button type="button" key={period} className={days === period ? "selected" : ""} onClick={() => changePeriod(period)}>{period} dias</button>)}</div></header><TrafficBars series={analytics.series} days={days} /></section>
        <div className="analytics-grid"><section className="analytics-panel"><header><div><span className="eyebrow">Aquisição</span><h2>Origens</h2></div><span>referrer disponível</span></header><BreakdownRows items={analytics.sources} empty="O Link ainda não recebeu tráfego neste período." /></section><section className="analytics-panel"><header><div><span className="eyebrow">Contexto</span><h2>Dispositivos</h2></div><span>classificação minimizada</span></header><BreakdownRows items={analytics.devices} empty="Ainda não existe amostra de dispositivo." /></section></div>
        <div className="link-inspector-grid"><section className="analytics-panel configuration-panel"><header><div><span className="eyebrow">Objeto central</span><h2>Configuração</h2></div><Link href="/product#links">Editar na biblioteca</Link></header><dl><div><dt>Destino</dt><dd title={link.destination_url}>{link.destination_url}</dd></div><div><dt>Campaign</dt><dd>{link.campaign_id ? <Link href={`/product/campaigns/${link.campaign_id}`}>{link.campaign_name}</Link> : "Sem Campaign"}</dd></div><div><dt>Canal</dt><dd>{link.channel ?? "Não definido"}</dd></div><div><dt>Tags</dt><dd>{link.tags.join(", ") || "Nenhuma"}</dd></div><div><dt>UTM</dt><dd>{[link.utm_source, link.utm_medium, link.utm_campaign, link.utm_content, link.utm_term].filter(Boolean).join(" · ") || "Não configurado"}</dd></div><div><dt>Criado em</dt><dd>{dateTime.format(link.created_at)}</dd></div></dl></section><section className="analytics-panel recent-events-panel"><header><div><span className="eyebrow">Atividade</span><h2>Eventos recentes</h2></div><span>até 25 cliques</span></header>{analytics.recentEvents.length ? <div className="recent-event-list">{analytics.recentEvents.map((event) => <article key={event.id}><time dateTime={new Date(event.occurredAt).toISOString()}>{dateTime.format(event.occurredAt)}</time><strong>{event.referrer}</strong><span>{event.device}</span></article>)}</div> : <div className="analytics-empty"><span>—</span><p>Nenhum evento registrado para este Link.</p></div>}</section></div>
      </div>}
    </main>
  </div>;
}
