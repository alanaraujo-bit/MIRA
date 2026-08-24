# ADR-003 — Data plane mínimo e PWA privada

Status: aceita em 24 de agosto de 2026.

## Redirect

O worker intercepta `/go/:slug` antes do app router. Seu módulo de dados recebe o binding D1 explicitamente e não importa identidade, UI ou repositórios do plano de controle.

Depois de resolver um Link ativo, o worker cria um request ID, agenda o click event com `waitUntil` e devolve imediatamente o 302. A persistência usa o request ID como chave e `INSERT OR IGNORE`, tornando uma repetição do mesmo evento inofensiva. Falhas de ingestão geram log estruturado sem destino, referrer, e-mail ou IP.

O redirect usa `no-store`, expõe `Server-Timing` e `X-Mira-Request-Id` e retorna 404 uniforme para slug inexistente, arquivado ou bloqueado.

## Controle de concorrência

Toda edição envia o `updated_at` conhecido. O update somente ocorre quando a versão ainda coincide; caso contrário retorna 409. Isso impede que uma sessão antiga sobrescreva silenciosamente uma mudança mais recente.

## PWA

A experiência instalada abre `/product`, mas o service worker nunca armazena respostas de produto autenticado, APIs, autenticação ou redirects. Somente o shell público e assets de marca podem ser cacheados. Sem rede, a aplicação mostra uma superfície offline sem dados de Workspace.
