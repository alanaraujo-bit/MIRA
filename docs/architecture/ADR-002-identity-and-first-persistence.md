# ADR-002 — Identidade e primeira persistência

Status: aceita em 24 de agosto de 2026.

## Decisão

O preview privado usa Sign in with ChatGPT (SIWC) fornecido pelo dispatcher para autenticação. O identificador estável recebido no servidor cria ou atualiza um registro local de usuário. Isso identifica a pessoa, mas não concede acesso automático a qualquer Workspace.

Toda consulta de produto verifica `workspace_members` no servidor. O cliente envia o Workspace desejado, mas nunca é fonte de autoridade. A primeira visita cria um Workspace e membership `owner` de modo idempotente.

D1 é a fonte de verdade para usuários, Workspaces, memberships, Links e eventos de clique. Preferências de tema podem continuar no navegador porque não são dados autoritativos do produto.

## Privacidade inicial

O evento de clique não persiste IP nem user-agent bruto. Nesta fase, armazena somente horário, link, Workspace, host do referrer e uma classe grosseira de dispositivo. Qualquer identificação de visitante futura exigirá finalidade, retenção, consentimento aplicável e análise de privacidade explícita.

## Limites conhecidos

- A publicação atual é owner-only; portanto o redirect ainda não é distribuível anonimamente.
- SIWC atende o preview privado. A jornada de autenticação do SaaS público será confirmada antes de construir cadastro e recuperação próprios.
- A ingestão ainda ocorre no caminho síncrono do redirect e será desacoplada antes de receber status concluído.
