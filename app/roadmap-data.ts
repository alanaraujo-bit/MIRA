export type Status = "done" | "active" | "queued" | "blocked";
type Task = { title: string; detail: string; status: Status; evidence?: string; blocker?: string };
type Milestone = { id: string; code: string; release: string; title: string; outcome: string; exitCriteria: string; tasks: Task[] };
type Phase = { id: string; code: string; title: string; intent: string; milestones: Milestone[] };
const task = (title: string, detail: string, status: Status = "queued", evidence?: string, blocker?: string): Task => ({ title, detail, status, evidence, blocker });

export const project = {
  release: "0.3.0-alpha.1", environment: "Vercel + Railway · candidata em validação", commit: "m3-analytics · candidata",
  liveUrl: "https://mira-link-intelligence.vercel.app",
  updatedIso: "2026-08-24T16:06:00-03:00", updatedLabel: "24 ago 2026 · 16:06 BRT",
  currentFocus: "Milestone 3 · Analytics de decisão",
  currentDetail: "Relatório comparativo e Link Inspector funcionam contra eventos reais; a candidata passa agora por publicação e validação remota.",
  currentGate: "deploy + smoke remoto + inspeção visual desktop/mobile",
  validations: [
    { status: "done", title: "Analytics reconciliado localmente", detail: "Evento real apareceu em série, origem, dispositivo, Link, Campaign e Inspector com a mesma contagem.", time: "24 ago" },
    { status: "done", title: "Controles analíticos", detail: "Período inválido 400, relatório cross-Workspace 403 e Link externo 404 foram confirmados contra o Railway.", time: "24 ago" },
    { status: "done", title: "Deploy Git em produção", detail: "Push do commit 42b3e2b no main acionou o Vercel e recebeu estado Ready no alias público definitivo.", time: "24 ago" },
    { status: "done", title: "Smoke remoto público", detail: "A jornada completa foi repetida em mira-link-intelligence.vercel.app; 302 e click persistido, QR, DNS, sessão e isolamento passaram.", time: "24 ago" },
    { status: "done", title: "Pipeline remoto aprovado", detail: "GitHub Actions executou install, lint, build, 8 testes e smoke persistente com PostgreSQL em 1m02s.", time: "24 ago" },
    { status: "done", title: "Runtime Vercel aprovado", detail: "Build Next.js 16 nativo compilou com TypeScript e gerou 28 rotas sem depender do runtime privado anterior.", time: "24 ago" },
    { status: "done", title: "PostgreSQL Railway real", detail: "Instância persistente provisionada com volume dedicado e conexão TLS; schema inicializado de forma idempotente.", time: "24 ago" },
    { status: "done", title: "Jornada pública local", detail: "Cadastro → sessão → Workspace → Campaign → Link → 302 → click → analytics → QR → logout/login passou contra o Railway; isolamento 403/404 confirmado.", time: "24 ago" },
    { status: "done", title: "Pesquisa inicial da marca", detail: "Triagem pública de categoria concluída; clearance jurídico segue pendente.", time: "24 ago" },
    { status: "done", title: "Servidor de preview", detail: "Base oficial de publicação inicializada e servindo localmente.", time: "24 ago" },
    { status: "done", title: "Build e testes", detail: "Build de produção aprovado; 2/2 contratos de render, metadata e PWA passaram após correção.", time: "24 ago" },
    { status: "done", title: "Publicação privada", detail: "Deployment concluído com sucesso e URL da release vinculada ao Roadmap.", time: "24 ago" },
    { status: "done", title: "Migration D1 inspecionada", detail: "Cinco tabelas, chaves estrangeiras e índices gerados; inicialização local idempotente corrigida após falha real.", time: "24 ago" },
    { status: "done", title: "Fluxo M1 local", detail: "Workspace → Link → 302 → click event → analytics executado com persistência real; 5/5 testes automatizados passaram.", time: "24 ago" },
    { status: "done", title: "Controles negativos", detail: "Acesso cruzado 403, destino privado 400 e slug inexistente 404 validados.", time: "24 ago" },
    { status: "done", title: "M1 alpha publicado", detail: "Versão 3 publicada com sucesso no ambiente privado, ligada ao commit 5d6a2c7.", time: "24 ago" },
    { status: "done", title: "D1 hospedado verificado", detail: "Binding DB ativo com users, workspaces, workspace_members, links e click_events após deploy.", time: "24 ago" },
    { status: "done", title: "CRUD M1 local", detail: "Criar, buscar, editar, arquivar, restaurar e copiar exercitados; conflito stale-write retorna 409.", time: "24 ago" },
    { status: "done", title: "Redirect fora do caminho de ingestão", detail: "302 inclui request ID e timing; click é persistido via waitUntil com INSERT OR IGNORE.", time: "24 ago" },
    { status: "done", title: "Proteções de write", detail: "Cross-site 403, content type inválido 415, acesso cruzado 403/404 e destino privado 400.", time: "24 ago" },
    { status: "done", title: "PWA sem cache sensível", detail: "Instalação abre o produto; API, produto autenticado e redirects usam network-only com fallback offline seguro.", time: "24 ago" },
    { status: "done", title: "M1 alpha 2 publicado", detail: "Versão 6 publicada com sucesso; artefato final ligado ao commit e5c0174 e binding D1 preservado.", time: "24 ago" },
    { status: "done", title: "Fluxo M2 local", detail: "Campaign → Link com canal/tags/UTMs → filtro → QR SVG → redirect executado em D1; controles 409/404 aprovados.", time: "24 ago" },
    { status: "done", title: "Dependência QR auditada", detail: "Auditoria das dependências de produção retornou 0 vulnerabilidades conhecidas; build, lint e 6/6 testes passaram.", time: "24 ago" },
    { status: "done", title: "M2 alpha 1 publicado", detail: "Sites versão 7 publicada com sucesso a partir do commit 2c6dac2; URL privada preservada.", time: "24 ago" },
    { status: "done", title: "Schema M2 hospedado", detail: "D1 verificado com oito tabelas: Campaigns, tags e relação Link–tag estão presentes ao lado do núcleo M1.", time: "24 ago" },
    { status: "done", title: "Toolchain endurecido", detail: "React/RSC, vinext, Vite e Cloudflare atualizados; 15 advisories altos removidos e corrida de empacotamento corrigida com regressão completa aprovada.", time: "24 ago" },
    { status: "done", title: "Paginação M2 validada", detail: "27 Links reais atravessaram páginas 25 + 2 sem duplicatas; cursor inválido retorna 400 e o plano usa o índice composto esperado.", time: "24 ago" },
    { status: "done", title: "Organização pessoal e UTM", detail: "Favorito isolado por usuário, filtro dedicado, preset compartilhado, normalização consistente, duplicata rejeitada e remoção exercitados.", time: "24 ago" },
    { status: "done", title: "Campaign Inspector local", detail: "Campaign com 27 Links consolidou dois canais, ranking de Links e métricas sem dados de demonstração.", time: "24 ago" },
    { status: "done", title: "M2 alpha 2 publicado", detail: "Sites versão 10 publicada no ambiente privado a partir do commit 09cf714; deployment concluído com sucesso.", time: "24 ago" },
    { status: "done", title: "Schema de escala hospedado", detail: "Binding DB verificado com 10 tabelas; link_favorites e utm_presets foram aplicadas ao lado do núcleo M2.", time: "24 ago" },
    { status: "done", title: "Fluxo de domínio local", detail: "Criar → instrução TXT → consulta DNS real → divergência acionável → Link associado → remoção segura foi executado em D1.", time: "24 ago" },
    { status: "done", title: "Controles de domínio", detail: "URL em vez de hostname, duplicata e acesso externo foram rejeitados; 8/8 testes e quatro smokes seguem aprovados.", time: "24 ago" },
    { status: "done", title: "M2 alpha 3 publicado", detail: "Sites versão 12 publicada no ambiente privado a partir do commit 93785c5; deployment concluído com sucesso.", time: "24 ago" },
    { status: "done", title: "Schema de domínios hospedado", detail: "Binding DB verificado com 11 tabelas; domains foi aplicada sem remover nenhuma entidade anterior.", time: "24 ago" },
  ],
  issues: [
    { severity: "medium", code: "P1", title: "Branded domains ainda não roteiam", detail: "Redirects no domínio público da Mira funcionam; propriedade DNS customizada pode ser confirmada, mas edge e emissão SSL por domínio permanecem um gate próprio." },
    { severity: "medium", code: "P2", title: "Inspeção visual indisponível", detail: "A conexão foi reavaliada e continua sem navegador controlável; o gate visual permanece aberto." },
    { severity: "low", code: "P3", title: "Clearance jurídico da marca", detail: "Busca formal de marca e domínio definitivo será necessária antes do lançamento comercial." },
    { severity: "low", code: "P4", title: "Advisories moderados no drizzle-kit", detail: "Quatro ocorrências de desenvolvimento vêm do loader interno; produção tem zero advisories e o fix automático exigiria downgrade incompatível. Monitorar atualização segura." },
  ],
  decisions: [
    { id: "001", title: "Mira é infraestrutura, não um encurtador", summary: "Link é um objeto versionado, programável e mensurável; slug e destino são apenas atributos.", status: "Aceita" },
    { id: "002", title: "Separar plano de controle e plano de dados", summary: "Gestão evolui independentemente do caminho crítico de redirect e ingestão de eventos.", status: "Aceita" },
    { id: "003", title: "Privacidade por minimização", summary: "Coleta necessária, precisão comunicada honestamente, retenção por plano e controles por Workspace.", status: "Aceita" },
    { id: "004", title: "Progresso deriva de evidência", summary: "Tarefas parciais não contam; milestones fecham com execução, teste, inspeção e publicação.", status: "Aceita" },
    { id: "005", title: "Identidade pública pertence à Mira", summary: "Cadastro e login usam senha com hash forte, cookie HTTP-only e sessão revogável; autorização de Workspace continua explícita e server-side.", status: "Aceita" },
    { id: "006", title: "Redirect possui dependência mínima", summary: "O worker consulta apenas o módulo do data plane e devolve o 302 antes de aguardar a persistência idempotente do evento.", status: "Aceita" },
    { id: "007", title: "PWA não armazena dados privados", summary: "Shell público pode usar cache; produto, APIs, autenticação e redirects permanecem network-only.", status: "Aceita" },
    { id: "008", title: "Escala progressiva na biblioteca", summary: "Links usam paginação keyset estável; favoritos são preferências pessoais e presets UTM pertencem ao Workspace.", status: "Aceita" },
    { id: "009", title: "Propriedade não equivale a ativação", summary: "TXT comprova controle do domínio; tráfego e SSL só recebem estado ativo depois de provisionamento público real.", status: "Aceita" },
  ],
};

export const phases: Phase[] = [
  { id: "foundation", code: "Fase 0", title: "Fundação observável", intent: "Estabelecer marca, arquitetura, execução e transparência antes de ampliar o produto.", milestones: [
    { id: "m0", code: "M0", release: "Release 0.0.1", title: "Marca + Roadmap Live", outcome: "Uma fundação publicada para acompanhar estado, evidência, riscos e decisões.", exitCriteria: "Roadmap publicado, responsivo, acessível, visualmente inspecionado e coerente com o repositório; release e ambiente identificados.", tasks: [
      task("Definir marca e posicionamento", "Mira estabelecida como plataforma de Link Intelligence e infraestrutura programável.", "done", "Triagem pública inicial e decisão registradas em BRAND.md."),
      task("Estabelecer princípios de produto", "Simplicidade progressiva, confiança, privacidade, performance e qualidade definidos.", "done", "Princípios ligados aos critérios de Done."),
      task("Desenhar arquitetura de referência", "Limites entre control plane, redirect edge, eventos, analytics e operações.", "done", "ADR-001 documentada; implementação será provada nos próximos milestones."),
      task("Construir Roadmap Live", "Interface responsiva com fases, tarefas, filtros, evidência, decisões e estados reais.", "done", "Build, testes e duas versões privadas publicadas; inspeção visual permanece em tarefa separada."),
      task("Publicar release 0.0.1", "Disponibilizar URL e conectar release, ambiente e origem.", "done", "Fonte validada vinculada à release 0.0.1 no Sites; publicação privada executada neste gate."),
      task("Validar desktop, mobile e PWA", "Inspecionar layout, contraste, teclado, filtros e instalação.", "blocked", undefined, "Navegador controlável indisponível na sessão atual."),
    ] },
  ]},
  { id: "core", code: "Fase 1", title: "Núcleo utilizável", intent: "Entregar conta, Workspace, link, redirect e evento confiável em um fluxo real.", milestones: [
    { id: "m1", code: "M1", release: "Release 0.1.0", title: "Primeiro link real", outcome: "Um usuário cria conta, publica um link e acompanha cliques reais.", exitCriteria: "Fluxo publicado e testado: cadastro → Workspace → criar → redirecionar → registrar evento → visualizar resultado.", tasks: [
      task("Fundação full-stack e ambientes", "Aplicação, banco, migrations, configuração segura, preview e CI.", "active", "GitHub → Vercel e PostgreSQL Railway estão operacionais; pipeline remoto passou. Migrations versionadas e observabilidade aprofundada continuam abertas."),
      task("Autenticação e sessões", "Cadastro, login, confirmação, recuperação, sessões seguras e estados de erro.", "active", "Cadastro/login públicos, bcrypt, cookie HTTP-only, expiração, logout e rate limit foram exercitados; confirmação e recuperação ainda não existem."),
      task("Workspace e autorização", "Isolamento multi-tenant, ownership e verificação de acesso em todas as operações.", "active", "Membership server-side cobre leitura e mutação; tentativas cross-Workspace retornam 403/404."),
      task("CRUD de Links", "Criar, editar, arquivar, buscar e copiar links com validação de destino e slug.", "active", "Fluxo completo publicado no alpha 2; inspeção visual e jornada autenticada hospedada ainda pendentes."),
      task("Redirect crítico", "Resolução de domínio/slug, cache, fallback seguro e baixa latência observável.", "active", "302/404 e no-store funcionam no runtime Next.js público; performance remota ainda será medida após o deploy Git."),
      task("Ingestão de click", "Registro assíncrono idempotente com minimização e classificação inicial.", "active", "Clique real persistiu no PostgreSQL sem IP ou user-agent bruto; confiabilidade sob falhas e carga permanece aberta."),
      task("Dashboard de primeiro valor", "Tráfego real, links recentes, atenção e próximos passos.", "active", "Busca, filtros, edição, estados, PWA e offline publicados; inspeção visual permanece bloqueada."),
    ] },
    { id: "m2", code: "M2", release: "Release 0.2.0", title: "Organização profissional", outcome: "Links operam em campanhas, tags, domínios e sistemas de busca eficientes.", exitCriteria: "Busca, filtros, campanhas e domínio base funcionam com dados reais e conjuntos grandes paginados.", tasks: [
      task("Campaigns de primeira classe", "Criação, canais, links associados e visão consolidada inicial.", "active", "Inspector, comparação por canal e ranking foram testados e publicados no alpha 2; inspeção visual ainda está aberta."),
      task("Busca e filtros", "Busca global, filtros compostos, tags, favoritos e estados persistidos.", "active", "Texto/status/campanha/tag/favoritos combinam com paginação keyset validada em 27 registros e publicada; gate visual segue aberto."),
      task("Domínios customizados", "Onboarding DNS, verificação, SSL, saúde e mensagens acionáveis.", "active", "TXT, consulta DNS real, estado operacional e associação de Link estão publicados; ownership positivo e edge/SSL públicos seguem abertos."),
      task("UTM management", "Templates, convenções, validação e prevenção de inconsistências.", "active", "Presets compartilhados e convenção lower-kebab foram validados; edição dedicada e análise de inconsistências ainda evoluirão."),
      task("QR integrado", "Geração, personalização, exportação e atribuição ao mesmo Link e Campaign.", "active", "SVG de alta correção foi publicado a partir do endereço rastreável com autorização de Workspace; personalização avançada e gate visual seguem abertos."),
    ] },
  ]},
  { id: "intelligence", code: "Fase 2", title: "Inteligência de tráfego", intent: "Transformar eventos confiáveis em entendimento, comparação e ação.", milestones: [
    { id: "m3", code: "M3", release: "Release 0.3.0", title: "Analytics de decisão", outcome: "O usuário entende o que mudou, por quê e onde agir.", exitCriteria: "Métricas reconciliadas, filtros temporais, comparação e drill-down testados com volume representativo.", tasks: [
      task("Pipeline analítico", "Agregações, retenção, reprocessamento e reconciliação de contagens.", "active", "Consultas atuais reconciliam eventos reais em todas as dimensões; materialização, reprocessamento e escala continuam abertos."),
      task("Tráfego e audiência", "Cliques, visitantes, sessões, origem, geografia aproximada e tecnologia.", "active", "Cliques, referrer e classe de dispositivo estão integrados; visitantes, sessões e geografia ainda não são inferidos."),
      task("Comparações temporais", "Período anterior, tendências, deltas explicáveis e mudanças.", "active", "Janelas equivalentes de 7/30/90 dias, série, deltas e estados sem base foram executados contra PostgreSQL."),
      task("Qualidade de tráfego", "Humanos, bots conhecidos, suspeitos, repetições e confiança.", "active", "Automação conhecida e sua participação estão expostas com limitação explícita; suspeitos e anomalias ainda evoluirão."),
      task("Link Inspector", "Performance, routing, QR, UTM, saúde e histórico organizados.", "active", "Performance, origem, dispositivo, configuração, QR e eventos recentes estão integrados; routing, health, version history e gate visual seguem abertos."),
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
