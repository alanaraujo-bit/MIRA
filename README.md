# Mira — Link Intelligence

Mira transforma links estáticos em infraestrutura programável. O repositório contém o Roadmap Live e um produto full-stack em evolução: identidade, Workspace, Links, Campaigns, organização por canal/tags/UTMs, QR integrado, redirect, evento de clique e resumo operacional baseados em dados reais.

A candidata pública `0.3.0-alpha.2` acrescenta sessões observadas privacy-safe ao Analytics comparativo e Link Inspector. O redirect usa um identificador opaco de 30 minutos, persiste apenas hash separado por Workspace, respeita GPC/DNT e informa cobertura sem chamar sessão de visitante. Cadastro, Workspace, Campaign, Link, três redirects, opt-out, Analytics, QR e domínio foram exercitados de ponta a ponta contra o PostgreSQL Railway. Os milestones continuam ativos enquanto inspeção visual, visitantes consentidos, escala analítica, recuperação/confirmação de conta e branded edge/SSL permanecerem abertos.

## Development

```bash
npm install
npm run dev
npm test
npm run test:smoke # com o servidor local ativo
npm run test:smoke:m2 # Campaigns, tags, UTMs e QR
npm run test:smoke:m2-scale # paginação, favoritos, presets e Inspector
npm run test:smoke:domains # domínio, DNS e associação de Link
npm run test:smoke:public # jornada pública completa com o servidor ativo
npm run db:generate
```

O Roadmap Live é a fonte de verdade do estado visível. Uma tarefa concluída inclui evidência de validação; trabalho parcial não conta como progresso.

## Estrutura

- `app/page.tsx` — Roadmap Live.
- `app/product` — shell autenticado do produto.
- `app/api` — bootstrap, Workspaces, Links, Campaigns, tags, QR e relatórios analíticos.
- `app/product/analytics` e `app/product/links/[id]` — Analytics de decisão e Link Inspector.
- `app/go` e `db/data-plane.ts` — redirect rastreável no caminho crítico mínimo.
- `db/postgres.ts` e `db/repository.ts` — persistência PostgreSQL e plano de controle.
- `docs/validation` — falhas, correções e resultados de execução.
