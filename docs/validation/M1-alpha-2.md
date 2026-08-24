# M1 alpha 2 — registro de validação

Data: 24 de agosto de 2026.

## Fluxo executado contra D1 local

- bootstrap autenticado e Workspace owner;
- criação e busca por slug;
- edição de nome e destino;
- tentativa de overwrite com versão antiga: 409;
- leitura cross-Workspace: 403;
- edição sem membership: 404 sem revelar existência;
- arquivamento seguido de redirect: 404;
- restauração seguida de redirect: 302;
- headers `Location`, `Server-Timing` e `X-Mira-Request-Id` presentes;
- evento assíncrono reconciliado no resumo como um clique mobile;
- destino privado: 400;
- write cross-site: 403;
- content type inadequado: 415.

## Qualidade automatizada

- lint sem erros;
- build de produção com oito superfícies reconhecidas;
- 5/5 testes unitários e de contrato aprovados;
- ícone PNG dinâmico, página offline e produto renderizados localmente com HTTP 200.

## Gates abertos

- publicação do alpha 2 e validação do artefato hospedado;
- inspeção visual desktop/mobile/PWA por navegador controlável;
- redirect anônimo em superfície pública;
- execução comprovada do workflow remoto.
