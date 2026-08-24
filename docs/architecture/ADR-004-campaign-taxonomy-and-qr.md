# ADR-004 — Campaigns, taxonomia e QR compartilham o Link

Status: aceita em 2026-08-24.

## Decisão

Campaign é uma entidade de primeira classe do Workspace. Canal e UTMs permanecem atributos do Link; tags usam uma taxonomia normalizada por Workspace e relação muitos-para-muitos. O QR codifica o mesmo endereço rastreável do Link em vez de criar outro destino ou silo analítico.

## Razões

- Campaign precisa consolidar performance sem duplicar eventos.
- Canal descreve a colocação específica de um Link e não deve ser confundido com a origem observada do tráfego.
- UTMs estruturadas reduzem inconsistência e preservam parâmetros externos já existentes.
- Tags normalizadas permitem organização reaproveitável e filtros indexáveis.
- Um único endereço rastreável mantém atribuição, histórico e futura programação coerentes em mídia digital e física.

## Consequências

- A criação simples continua com três campos; taxonomia e UTMs ficam em divulgação progressiva.
- A migration adiciona Campaigns, tags, relação Link–tag e colunas opcionais ao Link sem invalidar registros existentes.
- QR é uma representação exportável do Link, não uma entidade paralela nesta etapa. Personalização e arte-final persistente podem evoluir sem romper esse contrato.
