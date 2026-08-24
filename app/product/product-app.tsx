"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Workspace = { id: string; name: string; slug: string; role: string };
type LinkItem = {
  id: string;
  workspace_id: string;
  title: string;
  destination_url: string;
  slug: string;
  status: "active" | "archived" | "blocked";
  clicks: number;
};
type Summary = { activeLinks: number; clicks7d: number; devices: { name: string; value: number }[] };

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a operação.");
  return payload;
}

export default function ProductApp({ user }: { user: { displayName: string; email: string } }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ activeLinks: 0, clicks7d: 0, devices: [] });
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const boot = await jsonRequest<{ selected: Workspace }>("/api/bootstrap", { method: "POST", body: "{}" });
      setWorkspace(boot.selected);
      const query = encodeURIComponent(boot.selected.id);
      const [linkData, summaryData] = await Promise.all([
        jsonRequest<{ links: LinkItem[] }>(`/api/links?workspaceId=${query}`),
        jsonRequest<{ summary: Summary }>(`/api/analytics/summary?workspaceId=${query}`),
      ]);
      setLinks(linkData.links);
      setSummary(summaryData.summary);
      setState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha inesperada.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadWorkspace(), 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadWorkspace]);

  async function createFirstLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;
    setCreating(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await jsonRequest<{ link: LinkItem }>("/api/links", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: workspace.id,
          title: form.get("title"),
          destinationUrl: form.get("destinationUrl"),
          slug: form.get("slug"),
        }),
      });
      setLinks((current) => [data.link, ...current]);
      setSummary((current) => ({ ...current, activeLinks: current.activeLinks + 1 }));
      event.currentTarget.reset();
      setMessage("Link criado e pronto para receber tráfego.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o link.");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink(item: LinkItem) {
    const value = `${window.location.origin}/go/${item.slug}`;
    await navigator.clipboard.writeText(value);
    setCopied(item.id);
    window.setTimeout(() => setCopied(null), 1600);
  }

  const deviceLeader = useMemo(() => summary.devices[0], [summary.devices]);

  return (
    <div className="product-shell">
      <a className="skip-link" href="#product-main">Ir para o conteúdo</a>
      <aside className="product-sidebar">
        <Link className="brand" href="/" aria-label="Mira Roadmap"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Mira</span></Link>
        <div className="workspace-switcher"><span>Workspace</span><strong>{workspace?.name ?? "Carregando…"}</strong><small>{workspace?.role ?? ""}</small></div>
        <nav aria-label="Produto">
          <a className="selected" href="#overview"><span aria-hidden="true">⌂</span>Visão geral</a>
          <a href="#links"><span aria-hidden="true">↗</span>Links</a>
          <span aria-disabled="true"><span aria-hidden="true">◌</span>Analytics <small>em breve</small></span>
          <span aria-disabled="true"><span aria-hidden="true">◇</span>Campaigns <small>em breve</small></span>
        </nav>
        <Link className="roadmap-return" href="/">Roadmap Live <span>↗</span></Link>
      </aside>

      <main id="product-main" className="product-main">
        <header className="product-topbar">
          <div><span className="product-context">Visão geral</span><strong>{workspace?.name ?? "Mira"}</strong></div>
          <div className="product-user"><span>{user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>{user.email}</small></div></div>
        </header>

        {state === "loading" && <section className="product-state" aria-live="polite"><i /><h1>Preparando seu Workspace</h1><p>Conectando identidade, dados e permissões.</p></section>}
        {state === "error" && <section className="product-state error" role="alert"><span>!</span><h1>Não foi possível abrir o Workspace</h1><p>{message}</p><button className="button primary" onClick={() => void loadWorkspace()}>Tentar novamente</button></section>}

        {state === "ready" && workspace && <div className="product-content">
          <section className="product-intro" id="overview">
            <div><span className="eyebrow">Primeiro valor</span><h1>Transforme seu próximo endereço em infraestrutura.</h1><p>Crie um link permanente agora. A Mira registra o tráfego real sem armazenar IP bruto.</p></div>
            <a className="button quiet" href="#new-link">Criar link <span>↓</span></a>
          </section>

          <section className="metric-row" aria-label="Resumo dos últimos 7 dias">
            <article><span>Cliques · 7 dias</span><strong>{summary.clicks7d.toLocaleString("pt-BR")}</strong><small>{summary.clicks7d ? "dados reais registrados" : "aguardando primeiro acesso"}</small></article>
            <article><span>Links ativos</span><strong>{summary.activeLinks.toLocaleString("pt-BR")}</strong><small>neste Workspace</small></article>
            <article><span>Principal dispositivo</span><strong className="metric-word">{deviceLeader?.name ?? "—"}</strong><small>{deviceLeader ? `${deviceLeader.value} eventos` : "sem amostra suficiente"}</small></article>
          </section>

          <section className="create-link-panel" id="new-link">
            <header><div><span className="eyebrow">Ação rápida</span><h2>Novo link</h2></div><span className="secure-note">Destino validado · HTTPS recomendado</span></header>
            <form onSubmit={createFirstLink}>
              <label><span>Nome</span><input name="title" autoComplete="off" maxLength={100} placeholder="Lançamento de agosto" required /></label>
              <label className="destination-field"><span>URL de destino</span><input name="destinationUrl" type="url" inputMode="url" placeholder="https://empresa.com/oferta" required /></label>
              <label><span>Slug opcional</span><div className="slug-input"><small>/go/</small><input name="slug" autoComplete="off" maxLength={48} pattern="[A-Za-z0-9-]{3,48}" placeholder="lancamento" /></div></label>
              <button className="button primary" type="submit" disabled={creating}>{creating ? "Criando…" : "Criar link"}</button>
            </form>
            {message && <p className="form-message" role="status">{message}</p>}
          </section>

          <section className="links-panel" id="links">
            <header><div><span className="eyebrow">Biblioteca</span><h2>Links recentes</h2></div><span>{links.length} {links.length === 1 ? "item" : "itens"}</span></header>
            {links.length === 0 ? <div className="links-empty"><span>↗</span><h3>Seu primeiro link começa aqui.</h3><p>Preencha o formulário acima. Nenhum dado de demonstração está ocupando este espaço.</p></div> : <div className="links-table" role="table" aria-label="Links do Workspace">
              <div className="links-table-head" role="row"><span>Link</span><span>Destino</span><span>Cliques</span><span>Ação</span></div>
              {links.map((item) => <div className="link-row" key={item.id} role="row">
                <div><span className={`link-status ${item.status}`} aria-label={item.status} /><strong>{item.title}</strong><small>/go/{item.slug}</small></div>
                <a href={item.destination_url} target="_blank" rel="noreferrer">{new URL(item.destination_url).hostname}</a>
                <strong>{item.clicks.toLocaleString("pt-BR")}</strong>
                <button type="button" onClick={() => void copyLink(item)}>{copied === item.id ? "Copiado" : "Copiar"}</button>
              </div>)}
            </div>}
          </section>
        </div>}
      </main>
    </div>
  );
}
