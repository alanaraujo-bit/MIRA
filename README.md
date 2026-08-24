# Mira — Link Intelligence

Mira transforma links estáticos em infraestrutura programável. O repositório contém o Roadmap Live e o primeiro corte full-stack do produto: identidade, Workspace, Links, redirect, evento de clique e resumo operacional baseados em dados reais.

A release em construção `0.1.0-alpha.1` adiciona o fluxo real do primeiro link. O M1 continua ativo: publicação hospedada, inspeção visual, redirect público e partes restantes do CRUD ainda são gates abertos e aparecem assim no Roadmap.

## Development

```bash
npm install
npm run dev
npm test
npm run db:generate
```

O Roadmap Live é a fonte de verdade do estado visível. Uma tarefa concluída inclui evidência de validação; trabalho parcial não conta como progresso.

## Estrutura

- `app/page.tsx` — Roadmap Live.
- `app/product` — shell autenticado do produto.
- `app/api` — bootstrap, Workspaces, Links e analytics.
- `app/go/[slug]` — redirect rastreável.
- `db` e `drizzle` — schema, repositório D1 e migrations.
- `docs/validation` — falhas, correções e resultados de execução.
