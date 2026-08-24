"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Workspace = { id: string; name: string; slug: string; role: string };
type LinkStatus = "active" | "archived" | "blocked";
type LinkItem = {
  id: string;
  workspace_id: string;
  title: string;
  destination_url: string;
  slug: string;
  domain_id: string | null;
  domain_hostname: string | null;
  status: LinkStatus;
  created_at: number;
  updated_at: number;
  clicks: number;
  campaign_id: string | null;
  campaign_name: string | null;
  channel: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  tags: string[];
  is_favorite: boolean;
};
type Campaign = { id: string; name: string; status: "planning" | "active" | "ended"; links: number; clicks: number };
type Tag = { id: string; name: string; normalized_name: string; links: number };
type UtmPreset = { id: string; name: string; source: string | null; medium: string | null; campaign: string | null; content: string | null; term: string | null };
type Domain = { id: string; hostname: string; dns_status: "pending" | "verified" | "mismatch" | "unreachable"; status: "pending" | "verified" | "active" | "error" };
type UtmDraft = { source: string; medium: string; campaign: string; content: string; term: string };
type Summary = { activeLinks: number; clicks7d: number; devices: { name: string; value: number }[] };
type Notice = { tone: "success" | "error" | "info"; text: string } | null;

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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [presets, setPresets] = useState<UtmPreset[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalLinks, setTotalLinks] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [collectionState, setCollectionState] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState<Notice>(null);
  const [creating, setCreating] = useState(false);
  const [mutating, setMutating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<LinkItem | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [favoritesFilter, setFavoritesFilter] = useState(false);
  const [utmDraft, setUtmDraft] = useState<UtmDraft>({ source: "", medium: "", campaign: "", content: "", term: "" });
  const [presetName, setPresetName] = useState("");
  const [presetSelection, setPresetSelection] = useState("");
  const [presetBusy, setPresetBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const editTitleRef = useRef<HTMLInputElement>(null);

  const fetchWorkspaceData = useCallback(async (
    workspaceId: string,
    query: string,
    status: "all" | "active" | "archived",
    campaignId = "",
    tag = "",
    favorites = false,
    cursor = "",
    append = false,
  ) => {
    if (!append) setCollectionState("loading");
    else setLoadingMore(true);
    const params = new URLSearchParams({ workspaceId, query, status, campaignId, tag, favorites: favorites ? "1" : "0", limit: "25" });
    if (cursor) params.set("cursor", cursor);
    try {
      const [linkData, summaryData, campaignData, tagData, presetData, domainData] = await Promise.all([
        jsonRequest<{ links: LinkItem[]; nextCursor: string | null; total: number }>(`/api/links?${params.toString()}`),
        jsonRequest<{ summary: Summary }>(`/api/analytics/summary?workspaceId=${encodeURIComponent(workspaceId)}`),
        jsonRequest<{ campaigns: Campaign[] }>(`/api/campaigns?workspaceId=${encodeURIComponent(workspaceId)}`),
        jsonRequest<{ tags: Tag[] }>(`/api/tags?workspaceId=${encodeURIComponent(workspaceId)}`),
        jsonRequest<{ presets: UtmPreset[] }>(`/api/utm-presets?workspaceId=${encodeURIComponent(workspaceId)}`),
        jsonRequest<{ domains: Domain[] }>(`/api/domains?workspaceId=${encodeURIComponent(workspaceId)}`),
      ]);
      setLinks((current) => append ? [...current, ...linkData.links.filter((link) => !current.some((item) => item.id === link.id))] : linkData.links);
      setNextCursor(linkData.nextCursor);
      setTotalLinks(linkData.total);
      setSummary(summaryData.summary);
      setCampaigns(campaignData.campaigns);
      setTags(tagData.tags);
      setPresets(presetData.presets);
      setDomains(domainData.domains);
      setCollectionState("ready");
    } catch (error) {
      setCollectionState("error");
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Falha ao carregar os Links." });
    } finally {
      if (append) setLoadingMore(false);
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    setState("loading");
    setNotice(null);
    try {
      const boot = await jsonRequest<{ selected: Workspace }>("/api/bootstrap", { method: "POST", body: "{}" });
      setWorkspace(boot.selected);
      await fetchWorkspaceData(boot.selected.id, "", "all", "", "", false);
      setState("ready");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Falha inesperada." });
      setState("error");
    }
  }, [fetchWorkspaceData]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadWorkspace(), 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadWorkspace]);

  useEffect(() => {
    if (!workspace || state !== "ready") return;
    const searchTimer = window.setTimeout(
      () => void fetchWorkspaceData(workspace.id, search, statusFilter, campaignFilter, tagFilter, favoritesFilter),
      240,
    );
    return () => window.clearTimeout(searchTimer);
  }, [campaignFilter, favoritesFilter, fetchWorkspaceData, search, state, statusFilter, tagFilter, workspace]);

  useEffect(() => {
    if (editing) editTitleRef.current?.focus();
  }, [editing]);

  function showNotice(tone: NonNullable<Notice>["tone"], text: string) {
    setNotice({ tone, text });
  }

  async function createFirstLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;
    setCreating(true);
    setNotice(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const data = await jsonRequest<{ link: LinkItem }>("/api/links", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: workspace.id,
          title: form.get("title"),
          destinationUrl: form.get("destinationUrl"),
          slug: form.get("slug"),
          domainId: form.get("domainId") || null,
          campaignId: form.get("campaignId") || null,
          channel: form.get("channel") || null,
          tags: String(form.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
          utm: utmDraft,
        }),
      });
      setSearch("");
      setStatusFilter("active");
      setCampaignFilter("");
      setTagFilter("");
      setFavoritesFilter(false);
      setLinks((current) => [data.link, ...current.filter((item) => item.id !== data.link.id)]);
      setTotalLinks((total) => total + 1);
      setSummary((current) => ({ ...current, activeLinks: current.activeLinks + 1 }));
      formElement.reset();
      setUtmDraft({ source: "", medium: "", campaign: "", content: "", term: "" });
      showNotice("success", "Link criado e pronto para receber tráfego.");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Não foi possível criar o link.");
    } finally {
      setCreating(false);
    }
  }

  async function patchLink(item: LinkItem, changes: Partial<Pick<LinkItem, "title" | "slug" | "status">> & {
    destinationUrl?: string; domainId?: string | null; campaignId?: string | null; channel?: string | null; tags?: string[];
    utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string };
  }) {
    setMutating(item.id);
    setNotice(null);
    try {
      const data = await jsonRequest<{ link: LinkItem }>(`/api/links/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ ...changes, expectedUpdatedAt: item.updated_at }),
      });
      setLinks((current) => current.map((candidate) => candidate.id === data.link.id ? data.link : candidate));
      if (item.status !== data.link.status) {
        setSummary((current) => ({
          ...current,
          activeLinks: Math.max(0, current.activeLinks + (data.link.status === "active" ? 1 : -1)),
        }));
      }
      setEditing(null);
      showNotice("success", data.link.status === "archived" ? "Link arquivado. O endereço deixou de redirecionar." : "Alterações publicadas imediatamente.");
      if (workspace) await fetchWorkspaceData(workspace.id, search, statusFilter, campaignFilter, tagFilter, favoritesFilter);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Não foi possível atualizar o link.");
    } finally {
      setMutating(null);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    await patchLink(editing, {
      title: String(form.get("title") ?? ""),
      destinationUrl: String(form.get("destinationUrl") ?? ""),
      slug: String(form.get("slug") ?? ""),
      domainId: String(form.get("domainId") ?? "") || null,
      campaignId: String(form.get("campaignId") ?? "") || null,
      channel: String(form.get("channel") ?? "") || null,
      tags: String(form.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
      utm: { source: String(form.get("utmSource") ?? ""), medium: String(form.get("utmMedium") ?? ""),
        campaign: String(form.get("utmCampaign") ?? ""), content: String(form.get("utmContent") ?? ""),
        term: String(form.get("utmTerm") ?? "") },
    });
  }

  async function copyLink(item: LinkItem) {
    const value = item.domain_hostname ? `https://${item.domain_hostname}/${item.slug}` : `${window.location.origin}/go/${item.slug}`;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(item.id);
      showNotice("info", "Endereço copiado para a área de transferência.");
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      showNotice("error", `Não foi possível copiar automaticamente. Use ${value}`);
    }
  }

  async function toggleFavorite(item: LinkItem) {
    setMutating(item.id);
    try {
      const data = await jsonRequest<{ link: LinkItem }>(`/api/links/${encodeURIComponent(item.id)}/favorite`, {
        method: "PUT", body: JSON.stringify({ favorite: !item.is_favorite }),
      });
      setLinks((current) => favoritesFilter && !data.link.is_favorite
        ? current.filter((candidate) => candidate.id !== item.id)
        : current.map((candidate) => candidate.id === item.id ? data.link : candidate));
      if (favoritesFilter && !data.link.is_favorite) setTotalLinks((total) => Math.max(0, total - 1));
      showNotice("success", data.link.is_favorite ? "Link adicionado aos seus favoritos." : "Link removido dos seus favoritos.");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Não foi possível atualizar o favorito.");
    } finally { setMutating(null); }
  }

  function applyPreset(presetId: string) {
    setPresetSelection(presetId);
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    setUtmDraft({ source: preset.source ?? "", medium: preset.medium ?? "", campaign: preset.campaign ?? "",
      content: preset.content ?? "", term: preset.term ?? "" });
    showNotice("info", `Padrão “${preset.name}” aplicado ao próximo Link.`);
  }

  async function savePreset() {
    if (!workspace) return;
    setPresetBusy(true);
    try {
      const data = await jsonRequest<{ preset: UtmPreset }>("/api/utm-presets", { method: "POST",
        body: JSON.stringify({ workspaceId: workspace.id, name: presetName, utm: utmDraft }) });
      setPresets((current) => [data.preset, ...current]);
      setPresetSelection(data.preset.id);
      setPresetName("");
      showNotice("success", "Padrão UTM salvo para todo o Workspace.");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Não foi possível salvar o padrão UTM.");
    } finally { setPresetBusy(false); }
  }

  async function removePreset() {
    if (!presetSelection) return;
    setPresetBusy(true);
    try {
      const response = await fetch(`/api/utm-presets/${encodeURIComponent(presetSelection)}`, {
        method: "DELETE", headers: { "content-type": "application/json" }, body: "{}",
      });
      if (!response.ok) {
        const payload = await response.json() as { error?: string };
        throw new Error(payload.error || "Não foi possível remover o padrão UTM.");
      }
      setPresets((current) => current.filter((preset) => preset.id !== presetSelection));
      setPresetSelection("");
      showNotice("success", "Padrão UTM removido. Links existentes não foram alterados.");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Não foi possível remover o padrão UTM.");
    } finally { setPresetBusy(false); }
  }

  const deviceLeader = useMemo(() => summary.devices[0], [summary.devices]);
  const resultLabel = collectionState === "loading" ? "Atualizando…" : `${totalLinks} ${totalLinks === 1 ? "item" : "itens"}`;

  return (
    <div className="product-shell">
      <a className="skip-link" href="#product-main">Ir para o conteúdo</a>
      <aside className="product-sidebar">
        <Link className="brand" href="/" aria-label="Mira Roadmap"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Mira</span></Link>
        <div className="workspace-switcher"><span>Workspace</span><strong>{workspace?.name ?? "Carregando…"}</strong><small>{workspace?.role ?? ""}</small></div>
        <nav aria-label="Produto">
          <a className="selected" href="#overview"><span aria-hidden="true">⌂</span>Visão geral</a>
          <a href="#links"><span aria-hidden="true">↗</span>Links</a>
          <Link href="/product/campaigns"><span aria-hidden="true">◇</span>Campaigns</Link>
          <Link href="/product/domains"><span aria-hidden="true">◎</span>Domínios</Link>
          <span aria-disabled="true"><span aria-hidden="true">◌</span>Analytics <small>em breve</small></span>
        </nav>
        <Link className="roadmap-return" href="/">Roadmap Live <span>↗</span></Link>
      </aside>

      <main id="product-main" className="product-main">
        <header className="product-topbar">
          <div><span className="product-context">Visão geral</span><strong>{workspace?.name ?? "Mira"}</strong></div>
          <div className="product-user"><span>{user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>{user.email}</small></div></div>
        </header>

        {state === "loading" && <section className="product-state" aria-live="polite"><i /><h1>Preparando seu Workspace</h1><p>Conectando identidade, dados e permissões.</p></section>}
        {state === "error" && <section className="product-state error" role="alert"><span>!</span><h1>Não foi possível abrir o Workspace</h1><p>{notice?.text}</p><button className="button primary" onClick={() => void loadWorkspace()}>Tentar novamente</button></section>}

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

          {notice && <div className={`product-notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}><span aria-hidden="true">{notice.tone === "error" ? "!" : notice.tone === "success" ? "✓" : "i"}</span><p>{notice.text}</p><button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso">×</button></div>}

          <section className="create-link-panel" id="new-link">
            <header><div><span className="eyebrow">Ação rápida</span><h2>Novo link</h2></div><span className="secure-note">Destino validado · HTTPS recomendado</span></header>
            <form onSubmit={createFirstLink}>
              <label><span>Nome</span><input name="title" autoComplete="off" maxLength={100} placeholder="Lançamento de agosto" required /></label>
              <label className="destination-field"><span>URL de destino</span><input name="destinationUrl" type="url" inputMode="url" placeholder="https://empresa.com/oferta" required /></label>
              <label><span>Slug opcional</span><div className="slug-input"><small>/go/</small><input name="slug" autoComplete="off" maxLength={48} pattern="[A-Za-z0-9-]{3,48}" placeholder="lancamento" /></div></label>
              <button className="button primary" type="submit" disabled={creating}>{creating ? "Criando…" : "Criar link"}</button>
              <details className="advanced-fields"><summary>Organização e UTMs <span>opcional</span></summary><div>
                <label><span>Domínio de marca</span><select name="domainId" defaultValue=""><option value="">Domínio Mira</option>{domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.hostname}{domain.dns_status === "verified" ? " · verificado" : " · DNS pendente"}</option>)}</select></label>
                <label><span>Campanha</span><select name="campaignId" defaultValue=""><option value="">Sem campanha</option>{campaigns.filter((campaign) => campaign.status !== "ended").map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>
                <label><span>Canal</span><input name="channel" maxLength={50} placeholder="Instagram Stories" /></label>
                <label><span>Tags</span><input name="tags" placeholder="lançamento, social" /></label>
                <div className="utm-preset-bar"><label><span>Aplicar padrão UTM</span><select value={presetSelection} onChange={(event) => applyPreset(event.target.value)}><option value="">Selecione um padrão</option>{presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label><label><span>Salvar configuração como</span><input value={presetName} onChange={(event) => setPresetName(event.target.value)} maxLength={80} placeholder="Social orgânico" /></label><div className="utm-preset-actions"><button type="button" className="button quiet" disabled={presetBusy || !presetName.trim()} onClick={() => void savePreset()}>{presetBusy ? "Salvando…" : "Salvar padrão"}</button><button type="button" className="button quiet danger" disabled={presetBusy || !presetSelection} onClick={() => void removePreset()}>Remover</button></div></div>
                <label><span>UTM source</span><input name="utmSource" value={utmDraft.source} onChange={(event) => setUtmDraft((draft) => ({ ...draft, source: event.target.value }))} placeholder="instagram" /></label>
                <label><span>UTM medium</span><input name="utmMedium" value={utmDraft.medium} onChange={(event) => setUtmDraft((draft) => ({ ...draft, medium: event.target.value }))} placeholder="social" /></label>
                <label><span>UTM campaign</span><input name="utmCampaign" value={utmDraft.campaign} onChange={(event) => setUtmDraft((draft) => ({ ...draft, campaign: event.target.value }))} placeholder="lancamento-agosto" /></label>
                <label><span>UTM content</span><input name="utmContent" value={utmDraft.content} onChange={(event) => setUtmDraft((draft) => ({ ...draft, content: event.target.value }))} placeholder="story-a" /></label>
                <label><span>UTM term</span><input name="utmTerm" value={utmDraft.term} onChange={(event) => setUtmDraft((draft) => ({ ...draft, term: event.target.value }))} placeholder="opcional" /></label>
                <p className="utm-convention">A Mira padroniza UTMs em minúsculas, sem acentos e com hífens para evitar campanhas duplicadas por grafia.</p>
              </div></details>
            </form>
          </section>

          <section className="links-panel" id="links">
            <header><div><span className="eyebrow">Biblioteca</span><h2>Links</h2></div><span aria-live="polite">{resultLabel}</span></header>
            <div className="links-toolbar">
              <label><span className="sr-only">Buscar links</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, slug ou destino" /></label>
              <div role="group" aria-label="Filtrar links por status">
                {(["all", "active", "archived"] as const).map((status) => <button key={status} type="button" className={statusFilter === status ? "selected" : ""} onClick={() => setStatusFilter(status)}>{status === "all" ? "Todos" : status === "active" ? "Ativos" : "Arquivados"}</button>)}
                <button type="button" className={favoritesFilter ? "selected" : ""} aria-pressed={favoritesFilter} onClick={() => setFavoritesFilter((value) => !value)}>★ Favoritos</button>
              </div>
              <label className="campaign-filter"><span className="sr-only">Filtrar por campanha</span><select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)}><option value="">Todas as campanhas</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>
              <label className="campaign-filter"><span className="sr-only">Filtrar por tag</span><select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}><option value="">Todas as tags</option>{tags.map((tag) => <option key={tag.id} value={tag.normalized_name}>{tag.name} · {tag.links}</option>)}</select></label>
            </div>

            {collectionState === "error" ? <div className="links-empty error"><span>!</span><h3>Não foi possível atualizar a biblioteca.</h3><button className="button quiet" type="button" onClick={() => void fetchWorkspaceData(workspace.id, search, statusFilter, campaignFilter, tagFilter, favoritesFilter)}>Tentar novamente</button></div> : links.length === 0 ? <div className="links-empty"><span>{search || statusFilter !== "all" || campaignFilter || tagFilter || favoritesFilter ? "⌕" : "↗"}</span><h3>{search || statusFilter !== "all" || campaignFilter || tagFilter || favoritesFilter ? "Nenhum link corresponde aos filtros." : "Seu primeiro link começa aqui."}</h3><p>{search || statusFilter !== "all" || campaignFilter || tagFilter || favoritesFilter ? "Ajuste a busca ou os filtros." : "Preencha o formulário acima. Nenhum dado de demonstração está ocupando este espaço."}</p></div> : <div className={`links-table ${collectionState === "loading" ? "is-loading" : ""}`} role="table" aria-label="Links do Workspace" aria-busy={collectionState === "loading"}>
              <div className="links-table-head" role="row"><span>Link</span><span>Destino</span><span>Cliques</span><span>Ações</span></div>
              {links.map((item) => <div className="link-row" key={item.id} role="row">
                <div><span className={`link-status ${item.status}`} aria-label={item.status === "active" ? "Ativo" : item.status === "archived" ? "Arquivado" : "Bloqueado"} /><strong>{item.title}</strong><small>{item.domain_hostname ? `${item.domain_hostname}/${item.slug}` : `/go/${item.slug}`} · {[item.campaign_name, item.channel, ...item.tags].filter(Boolean).join(" · ") || (item.status === "active" ? "ativo" : item.status === "archived" ? "arquivado" : "bloqueado")}</small></div>
                <a href={item.destination_url} target="_blank" rel="noreferrer" title={item.destination_url}>{new URL(item.destination_url).hostname}</a>
                <strong>{item.clicks.toLocaleString("pt-BR")}</strong>
                <div className="link-actions">
                  <button type="button" className={item.is_favorite ? "favorite active" : "favorite"} aria-pressed={item.is_favorite} onClick={() => void toggleFavorite(item)} disabled={mutating === item.id}>{item.is_favorite ? "★ Salvo" : "☆ Favoritar"}</button>
                  <button type="button" onClick={() => void copyLink(item)}>{copied === item.id ? "Copiado" : "Copiar"}</button>
                  <button type="button" onClick={() => setEditing(item)} disabled={mutating === item.id}>Editar</button>
                  <a href={`/api/links/${encodeURIComponent(item.id)}/qr?download=1`}>QR</a>
                  <button type="button" className={item.status === "active" ? "danger" : ""} onClick={() => void patchLink(item, { status: item.status === "active" ? "archived" : "active" })} disabled={mutating === item.id}>{mutating === item.id ? "…" : item.status === "active" ? "Arquivar" : "Restaurar"}</button>
                </div>
              </div>)}
              {nextCursor && <div className="pagination-row"><span>{links.length} de {totalLinks} carregados</span><button type="button" className="button quiet" disabled={loadingMore} onClick={() => void fetchWorkspaceData(workspace.id, search, statusFilter, campaignFilter, tagFilter, favoritesFilter, nextCursor, true)}>{loadingMore ? "Carregando…" : "Carregar mais"}</button></div>}
            </div>}
          </section>
        </div>}
      </main>

      {editing && <div className="dialog-layer"><div className="edit-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-link-title">
        <form onSubmit={submitEdit}>
          <header><div><span className="eyebrow">Edição segura</span><h2 id="edit-link-title">Editar Link</h2></div><button type="button" onClick={() => setEditing(null)} aria-label="Fechar edição">×</button></header>
          <div className="dialog-fields">
            <label><span>Nome</span><input ref={editTitleRef} name="title" defaultValue={editing.title} maxLength={100} required /></label>
            <label><span>URL de destino</span><input name="destinationUrl" type="url" defaultValue={editing.destination_url} required /></label>
            <label><span>Slug</span><div className="slug-input"><small>/go/</small><input name="slug" defaultValue={editing.slug} maxLength={48} pattern="[A-Za-z0-9-]{3,48}" required /></div></label>
            <div className="dialog-grid"><label><span>Domínio</span><select name="domainId" defaultValue={editing.domain_id ?? ""}><option value="">Domínio Mira</option>{domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.hostname}{domain.dns_status === "verified" ? " · verificado" : " · DNS pendente"}</option>)}</select></label><label><span>Campanha</span><select name="campaignId" defaultValue={editing.campaign_id ?? ""}><option value="">Sem campanha</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label><label><span>Canal</span><input name="channel" defaultValue={editing.channel ?? ""} maxLength={50} /></label></div>
            <label><span>Tags, separadas por vírgula</span><input name="tags" defaultValue={editing.tags.join(", ")} /></label>
            <details className="dialog-utm"><summary>Parâmetros UTM</summary><div className="dialog-grid">
              <label><span>Source</span><input name="utmSource" defaultValue={editing.utm_source ?? ""} /></label><label><span>Medium</span><input name="utmMedium" defaultValue={editing.utm_medium ?? ""} /></label>
              <label><span>Campaign</span><input name="utmCampaign" defaultValue={editing.utm_campaign ?? ""} /></label><label><span>Content</span><input name="utmContent" defaultValue={editing.utm_content ?? ""} /></label>
              <label><span>Term</span><input name="utmTerm" defaultValue={editing.utm_term ?? ""} /></label>
            </div></details>
          </div>
          <p>As alterações entram em vigor assim que forem publicadas. Se outra sessão tiver alterado o Link, a Mira interrompe o salvamento para evitar sobrescrita.</p>
          <footer><button className="button quiet" type="button" onClick={() => setEditing(null)}>Cancelar</button><button className="button primary" type="submit" disabled={mutating === editing.id}>{mutating === editing.id ? "Publicando…" : "Publicar alterações"}</button></footer>
        </form>
      </div></div>}
    </div>
  );
}
