# M1 alpha 1 — registro de validação

Data: 24 de agosto de 2026.

## O que foi executado

- Build de produção com rotas para bootstrap, Workspaces, Links, analytics, redirect e produto.
- Migration Drizzle gerada e inspecionada: cinco tabelas, relacionamentos e índices ligados às consultas reais.
- Bootstrap autenticado contra D1 local.
- Criação de Link com destino HTTPS público.
- Acesso ao slug, resposta 302 e persistência de click event.
- Consulta posterior do resumo do Workspace, confirmando um link ativo, um clique e device class `mobile`.
- Versão 3 publicada no ambiente privado com o commit `5d6a2c7`.
- Binding D1 hospedado inspecionado após o deploy, confirmando as cinco tabelas da migration.

## Controles negativos

- Usuário sem membership consultando outro Workspace: HTTP 403.
- Destino `127.0.0.1`: HTTP 400.
- Slug inexistente: HTTP 404.

## Falha encontrada e correção

O primeiro bootstrap falhou com `no such table: users`. A migration estava gerada para o deploy, mas o D1 de desenvolvimento não havia sido inicializado. Foi adicionada inicialização idempotente por statements preparados, mantendo a migration como contrato de produção. O fluxo foi repetido e aprovado.

## Gates abertos

- inspeção visual desktop/mobile por navegador controlável;
- execução do fluxo autenticado contra o D1 hospedado;
- acesso público ao redirect;
- edição, arquivamento e busca;
- ingestão assíncrona e idempotente.
