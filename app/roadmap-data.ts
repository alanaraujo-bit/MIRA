export type Status = "done" | "active" | "queued" | "blocked";
type Task = { title: string; detail: string; status: Status; evidence?: string; blocker?: string };
type Milestone = { id: string; code: string; release: string; title: string; outcome: string; exitCriteria: string; tasks: Task[] };
type Phase = { id: string; code: string; title: string; intent: string; milestones: Milestone[] };
const task = (title: string, detail: string, status: Status = "queued", evidence?: string, blocker?: string): Task => ({ title, detail, status, evidence, blocker });

export const project = {
  release: "0.0.1", environment: "Sites · privado", commit: "main · v0.0.1",
  liveUrl: "https://mira-link-intelligence.alanvitoraraujo1a.chatgpt.site",
  updatedIso: "2026-08-24T12:34:00-03:00", updatedLabel: "24 ago 2026 · 12:34 BRT",
  currentFocus: "Milestone 0 · Fundação observável",
  currentDetail: "Roadmap Live, identidade da Mira, decisões técnicas e primeira publicação.",
  currentGate: "inspeção visual",
  validations: [
    { status: "done", title: "Pesquisa inicial da marca", detail: "Triagem pública de categoria concluída; clearance jurídico segue pendente.", time: "24 ago" },
    { status: "done", title: "Servidor de preview", detail: "Base oficial de publicação inicializada e servindo localmente.", time: "24 ago" },
    { status: "done", title: "Build e testes", detail: "Build de produção aprovado; 2/2 contratos de render, metadata e PWA passaram após correção.", time: "24 ago" },
    { status: "done", title: "Publicação privada", detail: "Deployment concluído com sucesso e URL da release vinculada ao Roadmap.", time: "24 ago" },
  ],
  issues: [
    { severity: "medium", code: "P2", title: "Inspeção visual indisponível", detail: "Nenhum navegador controlável está disponível nesta sessão; o gate visual permanece aberto." },
    { severity: "low", code: "P3", title: "Clearance jurídico da marca", detail: "Busca formal de marca e domínio definitivo será necessária antes do lançamento comercial." },
  ],
  decisions: [
    { id: "001", title: "Mira é infraestrutura, não um encurtador", summary: "Link é um objeto versionado, programável e mensurável; slug e destino são apenas atributos.", status: "Aceita" },
    { id: "002", title: "Separar plano de controle e plano de dados", summary: "Gestão evolui independentemente do caminho crítico de redirect e ingestão de eventos.", status: "Aceita" },
    { id: "003", title: "Privacidade por minimização", summary: "Coleta necessária, precisão comunicada honestamente, retenção por plano e controles por Workspace.", status: "Aceita" },
    { id: "004", title: "Progresso deriva de evidência", summary: "Tarefas parciais não contam; milestones fecham com execução, teste, inspeção e publicação.", status: "Aceita" },
  ],
};

export const phases: Phase[] = [
  { id: "foundation", code: "Fase 0", title: "Fundação observável", intent: "Estabelecer marca, arquitetura, execução e transparência antes de ampliar o produto.", milestones: [
    { id: "m0", code: "M0", release: "Release 0.0.1", title: "Marca + Roadmap Live", outcome: "Uma fundação publicada para acompanhar estado, evidência, riscos e decisões.", exitCriteria: "Roadmap publicado, responsivo, acessível, visualmente inspecionado e coerente com o repositório; release e ambiente identificados.", tasks: [
      task("Definir marca e posicionamento", "Mira estabelecida como plataforma de Link Intelligence e infraestrutura programável.", "done", "Triagem pública inicial e decisão registradas em BRAND.md."),
      task("Estabelecer princípios de produto", "Simplicidade progressiva, confiança, privacidade, performance e qualidade definidos.", "done", "Princípios ligados aos critérios de Done."),
      task("Desenhar arquitetura de referência", "Limites entre control plane, redirect edge, eventos, analytics e operações.", "done", "ADR-001 documentada; implementação será provada nos próximos milestones."),
      task("Construir Roadmap Live", "Interface responsiva com fases, tarefas, filtros, evidência, decisões e estados reais.", "active", "Preview local ativo; build, publicação e inspeção final pendentes."),
      task("Publicar release 0.0.1", "Disponibilizar URL e conectar release, ambiente e origem.", "done", "Fonte validada vinculada à release 0.0.1 no Sites; publicação privada executada neste gate."),
      task("Validar desktop, mobile e PWA", "Inspecionar layout, contraste, teclado, filtros e instalação.", "blocked", undefined, "Navegador controlável indisponível na sessão atual."),
    ] },
  ]},
  { id: "core", code: "Fase 1", title: "Núcleo utilizável", intent: "Entregar conta, Workspace, link, redirect e evento confiável em um fluxo real.", milestones: [
    { id: "m1", code: "M1", release: "Release 0.1.0", title: "Primeiro link real", outcome: "Um usuário cria conta, publica um link e acompanha cliques reais.", exitCriteria: "Fluxo publicado e testado: cadastro → Workspace → criar → redirecionar → registrar evento → visualizar resultado.", tasks: [
      task("Fundação full-stack e ambientes", "Aplicação, banco, migrations, configuração segura, preview e CI."),
      task("Autenticação e sessões", "Cadastro, login, confirmação, recuperação, sessões seguras e estados de erro."),
      task("Workspace e autorização", "Isolamento multi-tenant, ownership e verificação de acesso em todas as operações."),
      task("CRUD de Links", "Criar, editar, arquivar, buscar e copiar links com validação de destino e slug."),
      task("Redirect crítico", "Resolução de domínio/slug, cache, fallback seguro e baixa latência observável."),
      task("Ingestão de click", "Registro assíncrono idempotente com minimização e classificação inicial."),
      task("Dashboard de primeiro valor", "Tráfego real, links recentes, atenção e próximos passos."),
    ] },
    { id: "m2", code: "M2", release: "Release 0.2.0", title: "Organização profissional", outcome: "Links operam em campanhas, tags, domínios e sistemas de busca eficientes.", exitCriteria: "Busca, filtros, campanhas e domínio base funcionam com dados reais e conjuntos grandes paginados.", tasks: [
      task("Campaigns de primeira classe", "Criação, canais, links associados e visão consolidada inicial."),
      task("Busca e filtros", "Busca global, filtros compostos, tags, favoritos e estados persistidos."),
      task("Domínios customizados", "Onboarding DNS, verificação, SSL, saúde e mensagens acionáveis."),
      task("UTM management", "Templates, convenções, validação e prevenção de inconsistências."),
      task("QR integrado", "Geração, personalização, exportação e atribuição ao mesmo Link e Campaign."),
    ] },
  ]},
  { id: "intelligence", code: "Fase 2", title: "Inteligência de tráfego", intent: "Transformar eventos confiáveis em entendimento, comparação e ação.", milestones: [
    { id: "m3", code: "M3", release: "Release 0.3.0", title: "Analytics de decisão", outcome: "O usuário entende o que mudou, por quê e onde agir.", exitCriteria: "Métricas reconciliadas, filtros temporais, comparação e drill-down testados com volume representativo.", tasks: [
      task("Pipeline analítico", "Agregações, retenção, reprocessamento e reconciliação de contagens."),
      task("Tráfego e audiência", "Cliques, visitantes, sessões, origem, geografia aproximada e tecnologia."),
      task("Comparações temporais", "Período anterior, tendências, deltas explicáveis e mudanças."),
      task("Qualidade de tráfego", "Humanos, bots conhecidos, suspeitos, repetições e confiança."),
      task("Link Inspector", "Performance, routing, QR, UTM, saúde e histórico organizados."),
    ] },
    { id: "m4", code: "M4", release: "Release 0.4.0", title: "Live + conversões", outcome: "A jornada além do clique fica visível em tempo quase real.", exitCriteria: "Eventos chegam por integração real, aparecem no Live e reconciliam com atribuição e receita.", tasks: [
      task("Live Traffic", "Stream eficiente, filtros e pausa sem perder contexto operacional."),
      task("Eventos customizados", "Schema flexível, validação, deduplicação e debug."),
      task("Conversion API", "Ingestão server-side autenticada com exemplos e erros claros."),
      task("Atribuição inicial", "Modelo documentado de click, visitor, conversion e revenue."),
      task("Campaign intelligence", "Canais comparados por qualidade, conversão, receita e eficiência."),
    ] },
  ]},
  { id: "programmable", code: "Fase 3", title: "Links programáveis", intent: "Dar comportamento seguro e compreensível a um endereço permanente.", milestones: [
    { id: "m5", code: "M5", release: "Release 0.5.0", title: "Smart routing", outcome: "Um link roteia por contexto, divisão e calendário sem virar caixa-preta.", exitCriteria: "Regras simuláveis, versionadas, auditáveis, determinísticas e protegidas por fallback.", tasks: [
      task("Modelo de regras", "Prioridade, condições, destinos, fallback, conflitos e validação."), task("Device e locale routing", "Dispositivo, SO, idioma, país e região com precisão declarada."), task("Split testing", "Distribuição estável, pesos, amostra e leitura de resultado."), task("Regras temporais", "Agendamento, expiração e troca de destino com timezone explícito."), task("Simulador e rollout seguro", "Preview de decisão, logs, canary e rollback imediato."),
    ] },
  ]},
  { id: "trust", code: "Fase 4", title: "Trust, saúde e colaboração", intent: "Proteger links permanentes, equipes e usuários finais.", milestones: [
    { id: "m6", code: "M6", release: "Release 0.6.0", title: "Operação confiável", outcome: "Problemas de link, domínio, abuso e mudanças ficam acionáveis.", exitCriteria: "Monitores, alertas, auditoria e abuso são exercitados com falhas reais e cenários adversos.", tasks: [
      task("Link Health", "HTTP, TLS, loops, latência, mudanças e diagnóstico acionável."), task("Version history", "Diffs, ator, tempo, motivo e reversão segura."), task("Team e permissões", "Convites, papéis, ownership e agência multi-cliente."), task("Notificações", "Inbox, preferências, agrupamento, severidade e canais."), task("Trust & Safety", "Reputação, rate limits, detecção, revisão, bloqueio e apelação."),
    ] },
  ]},
  { id: "platform", code: "Fase 5", title: "Plataforma e ecossistema", intent: "Permitir que equipes técnicas integrem a Mira como infraestrutura.", milestones: [
    { id: "m7", code: "M7", release: "Release 0.7.0", title: "Developer platform", outcome: "API, webhooks e integrações recebem o mesmo rigor do produto visual.", exitCriteria: "Clientes completam fluxos documentados com credenciais rotacionáveis, logs e webhooks confiáveis.", tasks: [
      task("API pública versionada", "Recursos, paginação, idempotência, erros e limites consistentes."), task("Credenciais e logs", "Scopes, rotação, revogação, último uso e trilha."), task("Webhooks confiáveis", "Assinatura, retries, replay, DLQ e teste."), task("Documentação e SDK", "Quickstarts reais, exemplos executados e OpenAPI."), task("Integrações prioritárias", "CRM, automação e commerce escolhidos por valor real."),
    ] },
  ]},
  { id: "commercial", code: "Fase 6", title: "Operação comercial", intent: "Converter capacidade técnica em um SaaS sustentável e operável.", milestones: [
    { id: "m8", code: "M8", release: "Release 0.8.0", title: "Billing + administração", outcome: "Planos, uso, cobrança e operação interna sem atalhos inseguros.", exitCriteria: "Upgrade, cobrança, limite, cancelamento e suporte administrativo testados em sandbox.", tasks: [
      task("Entitlements e metering", "Limites por eventos, retenção, domínios, equipe e capacidade."), task("Planos e checkout", "Free, Scale e Business com comunicação honesta."), task("Lifecycle de assinatura", "Upgrade, downgrade, falha, invoices, cancelamento e reativação."), task("Admin interno protegido", "Contas, uso, abuso, incidentes, billing e saúde."), task("Website comercial", "Produto, casos, pricing, segurança, developers e CTA com substância."),
    ] },
  ]},
  { id: "scale", code: "Fase 7", title: "Escala e maturidade", intent: "Endurecer o produto com evidência de uso e preparar expansão enterprise.", milestones: [
    { id: "m9", code: "M9", release: "Release 1.0.0", title: "Commercial readiness", outcome: "A Mira pode ser apresentada, vendida e operada com confiança.", exitCriteria: "SLOs, segurança, recuperação, acessibilidade, performance, runbooks e jornadas comerciais passam pelo gate.", tasks: [
      task("SLOs e observabilidade", "Redirect, ingestão, API, jobs e produto com alertas por sintoma."), task("Resiliência e recuperação", "Backups testados, restore, filas, degradação e incidentes."), task("Security review", "Threat model, dependências, segredos, pentest e resposta."), task("Performance e escala", "Carga, hot paths, grandes Workspaces e custo por evento."), task("UX, a11y e PWA gate", "Desktop, mobile, WCAG, offline útil e instalação real."), task("Operação e lançamento", "Runbooks, suporte, políticas, onboarding e release 1.0."),
    ] },
  ]},
];
