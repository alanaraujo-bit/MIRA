# Mira — Link Intelligence

Mira transforma links estáticos em infraestrutura programável. O repositório contém o Roadmap Live e o primeiro corte full-stack do produto: identidade, Workspace, Links, redirect, evento de clique e resumo operacional baseados em dados reais.

A release em construção `0.1.0-alpha.2` adiciona CRUD completo, busca, controle de concorrência, redirect assíncrono e PWA sem cache de dados privados. O M1 continua ativo: publicação hospedada, inspeção visual, redirect público e execução remota do pipeline ainda são gates abertos e aparecem assim no Roadmap.

## Development

```bash
npm install
npm run dev
npm test
npm run test:smoke # com o servidor local ativo
npm run db:generate
```

O Roadmap Live é a fonte de verdade do estado visível. Uma tarefa concluída inclui evidência de validação; trabalho parcial não conta como progresso.

## Estrutura

- `app/page.tsx` — Roadmap Live.
- `app/product` — shell autenticado do produto.
- `app/api` — bootstrap, Workspaces, Links e analytics.
- `worker` e `db/data-plane.ts` — redirect rastreável no caminho crítico mínimo.
- `db` e `drizzle` — schema, plano de controle D1 e migrations.
- `docs/validation` — falhas, correções e resultados de execução.
