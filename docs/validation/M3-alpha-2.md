# M3 alpha 2 — sessões com privacidade por desenho

Data: 24 de agosto de 2026

## Decisão de produto

Visitantes únicos não serão inferidos silenciosamente por fingerprint. Sem consentimento e controles completos, isso criaria uma precisão aparente e ampliaria a coleta. Esta release mede somente sessões observadas de 30 minutos e comunica cobertura e limitações.

## Implementação

- Cookie first-party `mira_sid`, aleatório, HTTP-only, SameSite Lax e Secure em produção.
- Validade deslizante de 30 minutos.
- Somente o hash `SHA-256(workspaceId + token)` é persistido; o token bruto e o IP não entram em Analytics.
- O mesmo cookie gera hashes diferentes entre Workspaces.
- `Sec-GPC: 1` ou `DNT: 1` exclui o evento da sessão e envia remoção imediata do cookie.
- Cliques continuam registrados porque são a operação básica do Link; a cobertura de sessão explicita a diferença.
- Migration adiciona `session_id_hash` e índice composto por Workspace, sessão e tempo.

## Evidência executada antes da publicação

- Build Next.js e TypeScript aprovados com 30 rotas, incluindo a nova página pública de práticas de dados.
- 12 testes aprovados, incluindo estabilidade da sessão, separação entre Workspaces e GPC/DNT.
- Smoke contra PostgreSQL Railway: três cliques, uma sessão observada, dois eventos atribuídos e 66,7% de cobertura.
- Relatório e Link Inspector reconciliaram a mesma sessão e calcularam 2 cliques por sessão.
- O terceiro redirect, com GPC/DNT, removeu o cookie e não alterou a contagem de sessões.
- Migration `0005_previous_thunderbolt_ross.sql` foi gerada e inspecionada.
- Auditoria de dependências de produção: zero vulnerabilidades conhecidas.

## Evidência publicada

- Commit funcional `87cdf2e` publicado pelo `main` através da integração GitHub → Vercel.
- Deployment `dpl_AccwMM4Rj4gMTBd1iGnWnRcf5jBr` recebeu estado `Ready` no alias `https://mira-link-intelligence.vercel.app`.
- Smoke remoto confirmou novamente três cliques, uma sessão, 66,7% de cobertura e remoção por GPC/DNT.
- GitHub Actions `32767318368`: lint, build, 12 testes e smoke PostgreSQL aprovados em 1m17s.

## Limitações mantidas no produto

- Sessão não equivale a pessoa ou visitante único.
- Bloqueio de cookie, novo domínio, navegador ou expiração inicia outra sessão.
- Consentimento configurável, exportação e exclusão self-service permanecem gates anteriores à disponibilidade geral.
- Inspeção visual continua pendente enquanto a sessão não expõe navegador controlável.
