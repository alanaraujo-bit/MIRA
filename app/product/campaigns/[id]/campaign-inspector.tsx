"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import SignOutButton from "../../sign-out-button";

type Workspace = { id: string; name: string; role: string };
type CampaignDetail = { id: string; name: string; objective: string | null; status: "planning" | "active" | "ended";
  links: number; clicks: number; channels: { channel: string; links: number; clicks: number }[];
  top_links: { id: string; title: string; slug: string; channel: string | null; status: string; clicks: number }[] };

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Não foi possível carregar a Campaign.");
  return payload;
}

export default function CampaignInspector({ campaignId, user }: { campaignId: string; user: { displayName: string; email: string } }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setState("loading");
    try {
      const [boot, detail] = await Promise.all([
        getJson<{ selected: Workspace }>("/api/bootstrap", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }),
        getJson<{ campaign: CampaignDetail }>(`/api/campaigns/${encodeURIComponent(campaignId)}`),
      ]);
      setWorkspace(boot.selected);
      setCampaign(detail.campaign);
      setState("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha inesperada.");
      setState("error");
    }
  }, [campaignId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const bestChannel = useMemo(() => campaign?.channels[0] ?? null, [campaign]);

  return <div className="product-shell"><a className="skip-link" href="#campaign-inspector-main">Ir para o conteúdo</a>
    <aside className="product-sidebar"><Link className="brand" href="/" aria-label="Mira Roadmap"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Mira</span></Link><div className="workspace-switcher"><span>Workspace</span><strong>{workspace?.name ?? "Carregando…"}</strong><small>{workspace?.role ?? ""}</small></div><nav aria-label="Produto"><Link href="/product"><span aria-hidden="true">⌂</span>Visão geral</Link><Link href="/product#links"><span aria-hidden="true">↗</span>Links</Link><Link className="selected" href="/product/campaigns"><span aria-hidden="true">◇</span>Campaigns</Link><Link href="/product/domains"><span aria-hidden="true">◎</span>Domínios</Link><Link href="/product/analytics"><span aria-hidden="true">◌</span>Analytics</Link></nav><Link className="roadmap-return" href="/">Roadmap Live <span>↗</span></Link></aside>
    <main id="campaign-inspector-main" className="product-main"><header className="product-topbar"><div><span className="product-context">Campaign Inspector</span><strong>{campaign?.name ?? workspace?.name ?? "Mira"}</strong></div><SignOutButton user={user} /></header>
      {state === "loading" && <section className="product-state" aria-live="polite"><i /><h1>Lendo a Campaign</h1><p>Consolidando Links, canais e cliques reais.</p></section>}
      {state === "error" && <section className="product-state error" role="alert"><span>!</span><h1>Campaign indisponível</h1><p>{error}</p><button className="button primary" onClick={() => void load()}>Tentar novamente</button></section>}
      {state === "ready" && campaign && <div className="product-content inspector-content"><nav className="breadcrumb" aria-label="Navegação estrutural"><Link href="/product/campaigns">Campaigns</Link><span>/</span><span>{campaign.name}</span></nav><section className="product-intro"><div><span className="eyebrow">{campaign.status === "active" ? "Campaign ativa" : campaign.status === "planning" ? "Em planejamento" : "Campaign encerrada"}</span><h1>{campaign.name}</h1><p>{campaign.objective ?? "Objetivo ainda não documentado."}</p></div><Link className="button quiet" href="/product#links">Ver Links <span>↗</span></Link></section>
        <section className="metric-row" aria-label="Resumo da Campaign"><article><span>Cliques</span><strong>{campaign.clicks.toLocaleString("pt-BR")}</strong><small>eventos atribuídos</small></article><article><span>Links</span><strong>{campaign.links}</strong><small>pontos de distribuição</small></article><article><span>Canal líder</span><strong className="metric-word">{bestChannel?.channel ?? "—"}</strong><small>{bestChannel ? `${bestChannel.clicks.toLocaleString("pt-BR")} cliques` : "sem tráfego"}</small></article></section>
        <div className="inspector-grid"><section className="links-panel channel-panel"><header><div><span className="eyebrow">Comparação</span><h2>Canais</h2></div><span>{campaign.channels.length} canais</span></header>{campaign.channels.length === 0 ? <div className="links-empty"><span>◇</span><h3>Sem canais associados.</h3><p>Associe um canal aos Links desta Campaign.</p></div> : <div className="channel-list">{campaign.channels.map((channel) => <article key={channel.channel}><div><strong>{channel.channel}</strong><small>{channel.links} {channel.links === 1 ? "Link" : "Links"}</small></div><strong>{channel.clicks.toLocaleString("pt-BR")}</strong><span>cliques</span></article>)}</div>}</section>
          <section className="links-panel campaign-links-panel"><header><div><span className="eyebrow">Distribuição</span><h2>Links da Campaign</h2></div><span>ordenados por tráfego</span></header>{campaign.top_links.length === 0 ? <div className="links-empty"><span>↗</span><h3>Nenhum Link associado.</h3></div> : <div className="campaign-link-list">{campaign.top_links.map((link) => <article key={link.id}><div><strong>{link.title}</strong><small>/go/{link.slug} · {link.channel ?? "sem canal"}</small></div><strong>{link.clicks.toLocaleString("pt-BR")}</strong></article>)}</div>}</section></div>
      </div>}
    </main></div>;
}
