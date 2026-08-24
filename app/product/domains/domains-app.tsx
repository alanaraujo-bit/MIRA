"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import SignOutButton from "../sign-out-button";

type Workspace = { id: string; name: string; role: string };
type Domain = {
  id: string; hostname: string; verification_token: string; status: "pending" | "verified" | "active" | "error";
  dns_status: "pending" | "verified" | "mismatch" | "unreachable"; ssl_status: "pending" | "active" | "error";
  last_error: string | null; verified_at: number | null; last_checked_at: number | null;
};
type Notice = { tone: "success" | "error" | "info"; text: string } | null;

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const payload = response.status === 204 ? {} as T : await response.json() as T & { error?: string };
  if (!response.ok) throw new Error((payload as { error?: string }).error || "Não foi possível concluir a operação.");
  return payload;
}

const recordName = (hostname: string) => `_mira-verification.${hostname}`;
const recordValue = (token: string) => `mira-verification=${token}`;

export default function DomainsApp({ user }: { user: { displayName: string; email: string } }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setNotice(null);
    try {
      const boot = await jsonRequest<{ selected: Workspace }>("/api/bootstrap", { method: "POST", body: "{}" });
      const data = await jsonRequest<{ domains: Domain[] }>(`/api/domains?workspaceId=${encodeURIComponent(boot.selected.id)}`);
      setWorkspace(boot.selected);
      setDomains(data.domains);
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
    setBusy("create"); setNotice(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const result = await jsonRequest<{ domain: Domain }>("/api/domains", { method: "POST", body: JSON.stringify({
        workspaceId: workspace.id, hostname: data.get("hostname"),
      }) });
      setDomains((current) => [result.domain, ...current]);
      form.reset();
      setNotice({ tone: "success", text: "Domínio adicionado. Publique o registro TXT exibido abaixo para provar a propriedade." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível adicionar o domínio." });
    } finally { setBusy(null); }
  }

  async function verify(domain: Domain) {
    setBusy(domain.id); setNotice(null);
    try {
      const result = await jsonRequest<{ domain: Domain }>(`/api/domains/${domain.id}/verify`, { method: "POST", body: "{}" });
      setDomains((current) => current.map((item) => item.id === domain.id ? result.domain : item));
      setNotice(result.domain.dns_status === "verified"
        ? { tone: "success", text: "Propriedade confirmada. O provisionamento de tráfego e SSL da marca é o próximo gate." }
        : { tone: "info", text: result.domain.last_error ?? "O DNS ainda não corresponde ao registro esperado." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível verificar o DNS." });
    } finally { setBusy(null); }
  }

  async function remove(domain: Domain) {
    setBusy(domain.id); setNotice(null);
    try {
      await jsonRequest(`/api/domains/${domain.id}`, { method: "DELETE", body: "{}" });
      setDomains((current) => current.filter((item) => item.id !== domain.id));
      setNotice({ tone: "success", text: "Domínio removido. O registro DNS pode ser apagado no provedor." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível remover o domínio." });
    } finally { setBusy(null); }
  }

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => current === key ? null : current), 1600);
    } catch { setNotice({ tone: "error", text: "O navegador bloqueou a cópia. Selecione o valor manualmente." }); }
  }

  const totals = useMemo(() => ({
    verified: domains.filter((domain) => domain.dns_status === "verified").length,
    attention: domains.filter((domain) => domain.dns_status === "mismatch" || domain.dns_status === "unreachable").length,
    activeSsl: domains.filter((domain) => domain.ssl_status === "active").length,
  }), [domains]);

  return <div className="product-shell">
    <a className="skip-link" href="#domains-main">Ir para o conteúdo</a>
    <aside className="product-sidebar">
      <Link className="brand" href="/" aria-label="Mira Roadmap"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Mira</span></Link>
      <div className="workspace-switcher"><span>Workspace</span><strong>{workspace?.name ?? "Carregando…"}</strong><small>{workspace?.role ?? ""}</small></div>
      <nav aria-label="Produto"><Link href="/product"><span aria-hidden="true">⌂</span>Visão geral</Link><Link href="/product#links"><span aria-hidden="true">↗</span>Links</Link><Link href="/product/campaigns"><span aria-hidden="true">◇</span>Campaigns</Link><Link className="selected" href="/product/domains"><span aria-hidden="true">◎</span>Domínios</Link><span aria-disabled="true"><span aria-hidden="true">◌</span>Analytics <small>em breve</small></span></nav>
      <Link className="roadmap-return" href="/">Roadmap Live <span>↗</span></Link>
    </aside>
    <main id="domains-main" className="product-main">
      <header className="product-topbar"><div><span className="product-context">Domínios</span><strong>{workspace?.name ?? "Mira"}</strong></div><SignOutButton user={user} /></header>
      {state === "loading" && <section className="product-state" aria-live="polite"><i /><h1>Lendo a configuração DNS</h1><p>Organizando propriedade, saúde e disponibilidade.</p></section>}
      {state === "error" && <section className="product-state error" role="alert"><span>!</span><h1>Não foi possível abrir Domínios</h1><p>{notice?.text}</p><button className="button primary" onClick={() => void load()}>Tentar novamente</button></section>}
      {state === "ready" && workspace && <div className="product-content domains-content">
        <section className="product-intro"><div><span className="eyebrow">Branded links</span><h1>Sua marca em cada endereço.</h1><p>Conecte um domínio, prove a propriedade por DNS e acompanhe cada etapa sem precisar interpretar mensagens de infraestrutura.</p></div><a className="button quiet" href="#new-domain">Adicionar domínio <span>↓</span></a></section>
        <section className="metric-row" aria-label="Resumo de domínios"><article><span>Conectados</span><strong>{domains.length}</strong><small>neste Workspace</small></article><article><span>DNS verificado</span><strong>{totals.verified}</strong><small>{totals.attention ? `${totals.attention} exigem atenção` : "sem divergências conhecidas"}</small></article><article><span>SSL ativo</span><strong>{totals.activeSsl}</strong><small>depende do edge de marca</small></article></section>
        {notice && <div className={`product-notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}><span>{notice.tone === "error" ? "!" : notice.tone === "success" ? "✓" : "i"}</span><p>{notice.text}</p><button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso">×</button></div>}
        <section className="create-link-panel domain-create" id="new-domain"><header><div><span className="eyebrow">Nova identidade</span><h2>Conectar domínio</h2></div><span className="secure-note">Verificação TXT · sem transferência</span></header><form onSubmit={create}><label className="domain-host-field"><span>Domínio ou subdomínio</span><input name="hostname" autoCapitalize="none" autoComplete="off" inputMode="url" placeholder="go.empresa.com" required /></label><button className="button primary" type="submit" disabled={busy === "create"}>{busy === "create" ? "Adicionando…" : "Adicionar domínio"}</button></form><p className="form-message">A Mira nunca solicita acesso ao seu provedor DNS. Você publica apenas um TXT de verificação reversível.</p></section>
        <section className="links-panel domains-panel"><header><div><span className="eyebrow">Infraestrutura de marca</span><h2>Domínios</h2></div><span>{domains.length} {domains.length === 1 ? "item" : "itens"}</span></header>
          {domains.length === 0 ? <div className="links-empty"><span>◎</span><h3>Comece por um subdomínio.</h3><p>Use algo como go.suaempresa.com para isolar Links da Mira do seu site principal.</p></div> : <div className="domain-list">{domains.map((domain) => <article key={domain.id}>
            <header><div><span className={`domain-state ${domain.dns_status}`}>{domain.dns_status === "verified" ? "Propriedade verificada" : domain.dns_status === "unreachable" ? "Consulta indisponível" : domain.dns_status === "mismatch" ? "DNS não encontrado" : "Aguardando DNS"}</span><h3>{domain.hostname}</h3></div><div className="domain-actions"><button type="button" disabled={busy === domain.id} onClick={() => void verify(domain)}>{busy === domain.id ? "Consultando…" : "Verificar agora"}</button><button className="danger" type="button" disabled={busy === domain.id} onClick={() => void remove(domain)}>Remover</button></div></header>
            <div className="dns-instructions"><div><span>Tipo</span><code>TXT</code></div><div><span>Nome</span><code>{recordName(domain.hostname)}</code><button type="button" onClick={() => void copy(recordName(domain.hostname), `${domain.id}-name`)}>{copied === `${domain.id}-name` ? "Copiado" : "Copiar"}</button></div><div><span>Valor</span><code>{recordValue(domain.verification_token)}</code><button type="button" onClick={() => void copy(recordValue(domain.verification_token), `${domain.id}-value`)}>{copied === `${domain.id}-value` ? "Copiado" : "Copiar"}</button></div></div>
            <footer><div><span>DNS</span><strong>{domain.dns_status === "verified" ? "Verificado" : "Pendente"}</strong></div><div><span>SSL</span><strong>{domain.ssl_status === "active" ? "Ativo" : "Aguardando ativação"}</strong></div><div><span>Última consulta</span><strong>{domain.last_checked_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(domain.last_checked_at) : "Ainda não executada"}</strong></div></footer>
            {domain.last_error && <p className="domain-error">{domain.last_error}</p>}
          </article>)}</div>}
        </section>
        <aside className="activation-note"><span>Gate de ativação</span><div><h2>O DNS prova a propriedade; não publica tráfego sozinho.</h2><p>Este preview já serve redirects no domínio da Mira. A associação de cada domínio de marca ao edge e a emissão automática de SSL permanecem desativadas até o provisionamento seguro desse fluxo.</p></div></aside>
      </div>}
    </main>
  </div>;
}
