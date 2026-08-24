"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Workspace = { id: string; name: string; slug: string; role: string };
type CampaignStatus = "planning" | "active" | "ended";
type Campaign = { id: string; workspace_id: string; name: string; objective: string | null; status: CampaignStatus;
  starts_at: number | null; ends_at: number | null; created_at: number; updated_at: number; links: number; clicks: number };
type Notice = { tone: "success" | "error"; text: string } | null;

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a operação.");
  return payload;
}

export default function CampaignsApp({ user }: { user: { displayName: string; email: string } }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState<Notice>(null);
  const [creating, setCreating] = useState(false);
  const [mutating, setMutating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setNotice(null);
    try {
      const boot = await jsonRequest<{ selected: Workspace }>("/api/bootstrap", { method: "POST", body: "{}" });
      const data = await jsonRequest<{ campaigns: Campaign[] }>(`/api/campaigns?workspaceId=${encodeURIComponent(boot.selected.id)}`);
      setWorkspace(boot.selected);
      setCampaigns(data.campaigns);
      setState("ready");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Falha inesperada." });
      setState("error");
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;
    setCreating(true);
    setNotice(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const data = await jsonRequest<{ campaign: Campaign }>("/api/campaigns", { method: "POST", body: JSON.stringify({
        workspaceId: workspace.id, name: form.get("name"), objective: form.get("objective"), status: form.get("status"),
      }) });
      setCampaigns((current) => [data.campaign, ...current]);
      formElement.reset();
      setNotice({ tone: "success", text: "Campanha criada. Ela já pode receber Links e canais." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível criar a campanha." });
    } finally { setCreating(false); }
  }

  async function changeStatus(campaign: Campaign, status: CampaignStatus) {
    setMutating(campaign.id);
    setNotice(null);
    try {
      const data = await jsonRequest<{ campaign: Campaign }>(`/api/campaigns/${campaign.id}`, { method: "PATCH", body: JSON.stringify({
        status, expectedUpdatedAt: campaign.updated_at,
      }) });
      setCampaigns((current) => current.map((item) => item.id === campaign.id ? data.campaign : item));
      setNotice({ tone: "success", text: status === "ended" ? "Campanha encerrada sem alterar seus Links." : "Campanha reaberta." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível atualizar a campanha." });
    } finally { setMutating(null); }
  }

  const totals = useMemo(() => campaigns.reduce((result, campaign) => ({ links: result.links + campaign.links, clicks: result.clicks + campaign.clicks }), { links: 0, clicks: 0 }), [campaigns]);

  return <div className="product-shell">
    <a className="skip-link" href="#campaign-main">Ir para o conteúdo</a>
    <aside className="product-sidebar">
      <Link className="brand" href="/" aria-label="Mira Roadmap"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Mira</span></Link>
      <div className="workspace-switcher"><span>Workspace</span><strong>{workspace?.name ?? "Carregando…"}</strong><small>{workspace?.role ?? ""}</small></div>
      <nav aria-label="Produto"><Link href="/product"><span aria-hidden="true">⌂</span>Visão geral</Link><Link href="/product#links"><span aria-hidden="true">↗</span>Links</Link><span aria-disabled="true"><span aria-hidden="true">◌</span>Analytics <small>em breve</small></span><Link className="selected" href="/product/campaigns"><span aria-hidden="true">◇</span>Campaigns</Link></nav>
      <Link className="roadmap-return" href="/">Roadmap Live <span>↗</span></Link>
    </aside>
    <main id="campaign-main" className="product-main">
      <header className="product-topbar"><div><span className="product-context">Campaigns</span><strong>{workspace?.name ?? "Mira"}</strong></div><div className="product-user"><span>{user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>{user.email}</small></div></div></header>
      {state === "loading" && <section className="product-state" aria-live="polite"><i /><h1>Organizando campanhas</h1><p>Conectando Links, canais e métricas reais.</p></section>}
      {state === "error" && <section className="product-state error" role="alert"><span>!</span><h1>Não foi possível abrir Campaigns</h1><p>{notice?.text}</p><button className="button primary" onClick={() => void load()}>Tentar novamente</button></section>}
      {state === "ready" && workspace && <div className="product-content campaigns-content">
        <section className="product-intro"><div><span className="eyebrow">Organização por resultado</span><h1>Uma campanha. Todos os canais.</h1><p>Agrupe Links distribuídos em social, mídia paga, e-mail e QR sem perder a leitura consolidada.</p></div><a className="button quiet" href="#new-campaign">Nova campanha <span>↓</span></a></section>
        <section className="metric-row" aria-label="Resumo de campanhas"><article><span>Campaigns</span><strong>{campaigns.length}</strong><small>{campaigns.filter((campaign) => campaign.status === "active").length} ativas</small></article><article><span>Links vinculados</span><strong>{totals.links}</strong><small>organizados por objetivo</small></article><article><span>Cliques atribuídos</span><strong>{totals.clicks.toLocaleString("pt-BR")}</strong><small>eventos reais</small></article></section>
        {notice && <div className={`product-notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}><span>{notice.tone === "error" ? "!" : "✓"}</span><p>{notice.text}</p><button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso">×</button></div>}
        <section className="create-link-panel campaign-create" id="new-campaign"><header><div><span className="eyebrow">Nova estrutura</span><h2>Criar Campaign</h2></div><span className="secure-note">Métricas agregadas automaticamente</span></header><form onSubmit={create}>
          <label><span>Nome</span><input name="name" maxLength={100} placeholder="Black Friday 2026" required /></label><label className="campaign-objective"><span>Objetivo</span><input name="objective" maxLength={240} placeholder="Aquisição e receita atribuída por canal" /></label><label><span>Estado inicial</span><select name="status" defaultValue="active"><option value="active">Ativa</option><option value="planning">Planejamento</option></select></label><button className="button primary" type="submit" disabled={creating}>{creating ? "Criando…" : "Criar Campaign"}</button>
        </form></section>
        <section className="links-panel campaigns-panel"><header><div><span className="eyebrow">Portfólio</span><h2>Campaigns</h2></div><span>{campaigns.length} {campaigns.length === 1 ? "item" : "itens"}</span></header>
          {campaigns.length === 0 ? <div className="links-empty"><span>◇</span><h3>Organize antes de distribuir.</h3><p>Crie uma Campaign e associe seus próximos Links a ela.</p></div> : <div className="campaign-list">{campaigns.map((campaign) => <article key={campaign.id}><div className="campaign-main"><span className={`campaign-status ${campaign.status}`}>{campaign.status === "active" ? "Ativa" : campaign.status === "planning" ? "Planejamento" : "Encerrada"}</span><h3>{campaign.name}</h3><p>{campaign.objective ?? "Sem objetivo documentado."}</p></div><dl><div><dt>Links</dt><dd>{campaign.links}</dd></div><div><dt>Cliques</dt><dd>{campaign.clicks.toLocaleString("pt-BR")}</dd></div></dl><div className="campaign-actions"><Link href={`/product/campaigns/${campaign.id}`}>Abrir</Link><button type="button" disabled={mutating === campaign.id} onClick={() => void changeStatus(campaign, campaign.status === "ended" ? "active" : "ended")}>{mutating === campaign.id ? "Atualizando…" : campaign.status === "ended" ? "Reabrir" : "Encerrar"}</button></div></article>)}</div>}
        </section>
      </div>}
    </main>
  </div>;
}
