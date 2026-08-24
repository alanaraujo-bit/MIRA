"use client";

import { useEffect, useMemo, useState } from "react";
import { phases, project, type Status } from "./roadmap-data";

const labels: Record<Status, string> = { done: "Concluído", active: "Em execução", queued: "Pendente", blocked: "Bloqueado" };

export default function Home() {
  const [filter, setFilter] = useState<Status | "all">("all");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [expanded, setExpanded] = useState(() => new Set(["m0", "m1"]));

  useEffect(() => {
    const themeTimer = window.setTimeout(() => {
      const next = window.localStorage.getItem("mira-theme") === "dark" ? "dark" : "light";
      setTheme(next);
      document.documentElement.dataset.theme = next;
    }, 0);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => window.clearTimeout(themeTimer);
  }, []);

  const tasks = useMemo(() => phases.flatMap((phase) => phase.milestones.flatMap((milestone) => milestone.tasks)), []);
  const stats = {
    total: tasks.length,
    done: tasks.filter((task) => task.status === "done").length,
    active: tasks.filter((task) => task.status === "active").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
  };
  const progress = Math.round((stats.done / stats.total) * 100);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("mira-theme", next);
  }
  function toggleMilestone(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function matches(task: { title: string; detail: string; evidence?: string; status: Status }) {
    const text = `${task.title} ${task.detail} ${task.evidence ?? ""}`.toLocaleLowerCase("pt-BR");
    return (filter === "all" || task.status === filter) && text.includes(query.toLocaleLowerCase("pt-BR"));
  }

  return (
    <>
      <a className="skip-link" href="#main">Ir para o conteúdo</a>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Mira, início"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Mira</span></a>
        <nav aria-label="Navegação principal"><a className="nav-active" href="#roadmap">Roadmap</a><a href="#releases">Releases</a><a href="#decisions">Decisões</a></nav>
        <div className="top-actions"><span className="release-pill"><i />Release {project.release}</span><button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Ativar tema ${theme === "light" ? "escuro" : "claro"}`}>{theme === "light" ? "◐" : "☀"}</button></div>
      </header>

      <main id="main">
        <section className="hero" id="top">
          <div className="hero-copy">
            <div className="overline"><span>Roadmap Live</span><time dateTime={project.updatedIso}>Atualizado {project.updatedLabel}</time></div>
            <h1>Infraestrutura programável para cada link.</h1>
            <p className="lede">A Mira transforma links distribuídos em uma camada controlável de roteamento, atribuição e inteligência. Este painel mostra o trabalho real — inclusive o que ainda não existe.</p>
            <div className="hero-actions"><a className="button primary" href="#roadmap">Ver execução <span aria-hidden="true">→</span></a><a className="button quiet" href="/product">Abrir produto <span aria-hidden="true">↗</span></a></div>
          </div>
          <aside className="signal-panel" aria-label="Resumo operacional">
            <div className="signal-top"><span>Estado operacional</span><strong><i /> Fundação ativa</strong></div>
            <div className="progress-number"><strong>{progress}</strong><span>%</span></div>
            <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(progress, 2)}%` }} /></div>
            <p>Progresso calculado por subtarefas concluídas. Trabalho parcial não entra na conta.</p>
            <div className="signal-grid"><div><strong>{stats.done}</strong><span>validadas</span></div><div><strong>{stats.active}</strong><span>em execução</span></div><div><strong>{stats.blocked}</strong><span>bloqueadas</span></div></div>
          </aside>
        </section>

        <section className="now-strip" aria-label="Trabalho atual"><span className="now-label">Agora</span><div><strong>{project.currentFocus}</strong><p>{project.currentDetail}</p></div><span className="eta">Gate: {project.currentGate}</span></section>

        <section className="roadmap-shell" id="roadmap">
          <div className="section-intro"><div><span className="section-kicker">Plano de execução</span><h2>Do núcleo confiável à infraestrutura enterprise.</h2></div><p>As fases seguem dependências reais: primeiro controle e confiabilidade; depois profundidade analítica, automação e escala.</p></div>
          <div className="roadmap-tools" aria-label="Filtros do roadmap">
            <label className="search-box"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tarefa, validação ou módulo" /></label>
            <div className="filters" role="group" aria-label="Filtrar por status">{([["all", "Tudo"], ["active", "Em execução"], ["done", "Concluído"], ["queued", "Pendente"], ["blocked", "Bloqueado"]] as const).map(([value, label]) => <button type="button" className={`filter ${filter === value ? "active" : ""}`} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div>
          </div>

          <div className="roadmap-content">
            {phases.map((phase) => {
              const milestones = phase.milestones.filter((milestone) => milestone.tasks.some(matches));
              if (!milestones.length) return null;
              return <section className="phase" aria-labelledby={`phase-${phase.id}`} key={phase.id}>
                <header className="phase-head"><div><span>{phase.code}</span><h2 id={`phase-${phase.id}`}>{phase.title}</h2></div><p>{phase.intent}</p></header>
                <div className="milestone-list">{milestones.map((milestone) => {
                  const visibleTasks = milestone.tasks.filter(matches);
                  const done = milestone.tasks.filter((item) => item.status === "done").length;
                  const milestoneProgress = Math.round((done / milestone.tasks.length) * 100);
                  const isOpen = expanded.has(milestone.id);
                  return <article className={`milestone ${isOpen ? "is-open" : ""}`} key={milestone.id}>
                    <button className="milestone-head" type="button" aria-expanded={isOpen} onClick={() => toggleMilestone(milestone.id)}>
                      <div className="milestone-index">{milestone.code}</div><div className="milestone-heading"><div className="eyebrow">{milestone.release}</div><h3>{milestone.title}</h3><p>{milestone.outcome}</p></div><div className="milestone-progress" aria-label={`${milestoneProgress}% concluído`}><strong>{milestoneProgress}%</strong><span>{done}/{milestone.tasks.length}</span></div><span className="expand-icon" aria-hidden="true">⌄</span>
                    </button>
                    {isOpen && <div className="milestone-body"><div className="done-criteria"><span>Critério de saída</span><p>{milestone.exitCriteria}</p></div><ul className="task-list">{visibleTasks.map((item) => <li className="task-row" data-status={item.status} key={item.title}><span className="status-mark" aria-hidden="true" /><div className="task-copy"><div className="task-title-line"><h4>{item.title}</h4><span className="status-label">{labels[item.status]}</span></div><p>{item.detail}</p>{item.evidence && <div className="validation"><span>Validação</span>{item.evidence}</div>}{item.blocker && <div className="blocker"><span>Dependência</span>{item.blocker}</div>}</div></li>)}</ul></div>}
                  </article>;
                })}</div>
              </section>;
            })}
          </div>
        </section>

        <section className="evidence-grid" id="releases">
          <div className="section-intro compact"><div><span className="section-kicker">Evidência</span><h2>Release, testes e mudanças.</h2></div><p>Um registro curto do que foi executado. Sem transformar atividade em resultado.</p></div>
          <div className="evidence-columns">
            <article className="evidence-card"><header><span>Release atual</span><strong>{project.release}</strong></header><h3>Analytics de decisão ao vivo</h3><p>Períodos comparáveis, origens, dispositivos, rankings, insights e Link Inspector operam sobre eventos persistidos no Railway; gates restantes continuam explícitos.</p><a className="release-link" href={project.liveUrl} target="_blank" rel="noreferrer">Abrir release <span aria-hidden="true">↗</span></a><dl><div><dt>Ambiente</dt><dd>{project.environment}</dd></div><div><dt>Origem</dt><dd>{project.commit}</dd></div><div><dt>Saúde</dt><dd className="status-inline active">Operacional · visual pendente</dd></div></dl></article>
            <article className="evidence-card"><header><span>Últimas validações</span><strong>{project.validations.length}</strong></header><ul className="log-list">{project.validations.map((item) => <li key={item.title}><span className={`log-icon ${item.status}`} /><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.time}</time></li>)}</ul></article>
            <article className="evidence-card"><header><span>Problemas abertos</span><strong>{project.issues.length}</strong></header><ul className="log-list">{project.issues.map((item) => <li key={item.title}><span className={`issue-severity ${item.severity}`}>{item.code}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div></li>)}</ul></article>
          </div>
        </section>

        <section className="decisions" id="decisions"><div className="section-intro compact"><div><span className="section-kicker">Decisões registradas</span><h2>O que orienta a construção.</h2></div><p>As decisões podem evoluir, mas nunca silenciosamente.</p></div><div className="decision-list">{project.decisions.map((decision) => <article key={decision.id}><div className="decision-number">{decision.id}</div><div><h3>{decision.title}</h3><p>{decision.summary}</p></div><span>{decision.status}</span></article>)}</div></section>
      </main>
      <footer><div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Mira</span></div><p>Link Intelligence · Estado verificável.</p><span>{project.updatedLabel}</span></footer>
    </>
  );
}
