# Mira — Link Intelligence

Mira transforma links estáticos em infraestrutura programável. O repositório contém o Roadmap Live e um produto full-stack em evolução: identidade, Workspace, Links, Campaigns, organização por canal/tags/UTMs, QR integrado, redirect, evento de clique e resumo operacional baseados em dados reais.

A release pública `0.2.0-alpha.4` usa Next.js no Vercel, PostgreSQL persistente no Railway e autenticação própria da Mira. Cadastro, sessão, Workspace, Links, Campaigns, organização, QR, redirect, evento de clique e analytics foram exercitados de ponta a ponta contra o banco real. M1 e M2 continuam ativos enquanto inspeção visual, recuperação/confirmação de conta, branded edge/SSL e validações operacionais permanecerem abertas; o Roadmap não os apresenta como concluídos.

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
- `app/api` — bootstrap, Workspaces, Links, Campaigns, tags, QR e analytics.
- `app/go` e `db/data-plane.ts` — redirect rastreável no caminho crítico mínimo.
- `db/postgres.ts` e `db/repository.ts` — persistência PostgreSQL e plano de controle.
- `docs/validation` — falhas, correções e resultados de execução.
