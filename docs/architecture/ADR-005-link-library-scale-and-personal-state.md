# ADR-005 — paginação keyset e estado pessoal

Status: aceita em 2026-08-24.

## Decisão

A biblioteca de Links usa paginação keyset por `(workspace_id, updated_at, id)`, não offset. Favoritos pertencem ao par usuário–Link. Padrões UTM pertencem ao Workspace e seus valores são normalizados antes de persistir e aplicar.

## Razões

- Offset degrada e pode repetir ou omitir itens quando Links são alterados durante a navegação.
- O `id` desempata Links com o mesmo timestamp e torna o cursor determinístico.
- Favorito é uma preferência de produtividade individual, inclusive para membros `viewer`; não deve modificar o objeto compartilhado.
- Presets UTM precisam ser compartilhados para reduzir divergência de nomenclatura entre membros e canais.

## Consequências

- O cursor é opaco, validado no servidor e retorna erro explícito quando adulterado.
- Filtros são reaplicados a cada página e a resposta inclui total e próximo cursor.
- O índice composto segue a ordenação da consulta e foi verificado com `EXPLAIN QUERY PLAN`.
- A normalização é visível na interface para evitar alteração silenciosa de expectativa.
