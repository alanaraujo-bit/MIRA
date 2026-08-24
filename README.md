# Mira — Link Intelligence

Mira transforma links estáticos em infraestrutura programável. O repositório contém o Roadmap Live e um produto full-stack em evolução: identidade, Workspace, Links, Campaigns, organização por canal/tags/UTMs, QR integrado, redirect, evento de clique e resumo operacional baseados em dados reais.

A release em construção `0.2.0-alpha.2` amplia o M2 com paginação por cursor, favoritos pessoais, padrões UTM reutilizáveis e Campaign Inspector. M1 e M2 continuam ativos enquanto publicação hospedada, inspeção visual, redirect público e execução remota do pipeline forem gates abertos; o Roadmap não os apresenta como concluídos.

## Development

```bash
npm install
npm run dev
npm test
npm run test:smoke # com o servidor local ativo
npm run test:smoke:m2 # Campaigns, tags, UTMs e QR
npm run test:smoke:m2-scale # paginação, favoritos, presets e Inspector
npm run db:generate
```

O Roadmap Live é a fonte de verdade do estado visível. Uma tarefa concluída inclui evidência de validação; trabalho parcial não conta como progresso.

## Estrutura

- `app/page.tsx` — Roadmap Live.
- `app/product` — shell autenticado do produto.
- `app/api` — bootstrap, Workspaces, Links, Campaigns, tags, QR e analytics.
- `worker` e `db/data-plane.ts` — redirect rastreável no caminho crítico mínimo.
- `db` e `drizzle` — schema, plano de controle D1 e migrations.
- `docs/validation` — falhas, correções e resultados de execução.
