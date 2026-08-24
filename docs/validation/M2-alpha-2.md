# M2 alpha 2 — escala e organização reutilizável

Data: 2026-08-24

## Escopo executado

- Biblioteca paginada por cursor composto de `updated_at` e `id`, com páginas de 25 itens.
- Contagem total e filtros combináveis por texto, status, Campaign, tag e favorito.
- Favoritos pessoais por membro, separados da permissão de escrita do Workspace.
- Padrões UTM compartilhados pelo Workspace, com criação, aplicação, remoção e rejeição de nomes duplicados.
- Convenção UTM determinística: minúsculas, sem acentos e com hífens.
- Campaign Inspector com consolidação por canal e ranking inicial dos Links.

## Evidência funcional

- Os smokes M1 e M2 existentes continuaram aprovados.
- O smoke de escala criou 27 Links persistentes e recebeu páginas de 25 + 2 sem IDs duplicados.
- Cursor adulterado retornou 400.
- Favorito criado por um membro apareceu no filtro pessoal; usuário externo recebeu 404.
- Preset `Social Orgânico` persistiu `instagram-brasil` e `midia-social`; nome duplicado retornou 400 e remoção retornou 204.
- Campaign Inspector reconciliou 27 Links em dois canais.
- `EXPLAIN QUERY PLAN` local reportou `USING COVERING INDEX idx_links_workspace_updated_id` na consulta ordenada da biblioteca.

## Gates

- O Browser foi reavaliado e retornou lista vazia; desktop/mobile continuam sem inspeção visual controlada.
- Publicação e verificação da migration hospedada ainda são necessárias para este candidato.
- Domínios customizados continuam fora deste corte e impedem concluir o M2.
