# M2 alpha 1 — organização profissional

Data: 2026-08-24

## Escopo executado

- Campaigns persistentes com estado, objetivo, agregação de Links e cliques.
- Associação do Link a Campaign, canal, até oito tags normalizadas e cinco parâmetros UTM.
- Busca composta por texto, status, Campaign e tag.
- QR em SVG do endereço rastreável, protegido pela autorização do Workspace e exportável.
- Interfaces responsivas iniciais para Campaigns e organização avançada de Links.

## Evidência local

- `npm run lint`: aprovado.
- `npm test`: build de produção e 6/6 testes aprovados.
- `npm run test:smoke`: fluxo M1 e controles negativos aprovados.
- `npm run test:smoke:m2`: Campaign → Link → persistência → filtro → QR → redirect aprovado.
- Controles específicos: stale write de Campaign retorna 409; usuário externo recebe 404 ao solicitar QR.
- `npm audit --omit=dev`: zero vulnerabilidades conhecidas nas dependências de produção.

## Falhas e correções

- A execução inicial do servidor com PTY falhou por acesso negado ao `pwsh` do WindowsApps. O servidor foi iniciado com Windows PowerShell explícito e os dois smokes concluíram sem erro de aplicação.
- O navegador controlável permanece indisponível (`agent.browsers.list()` vazio); inspeção visual desktop/mobile continua aberta e impede marcar as tarefas de interface como concluídas.

## Gates ainda abertos

- Publicar e verificar a migration D1 hospedada.
- Executar a jornada autenticada no ambiente hospedado.
- Inspecionar visualmente desktop e mobile.
- Disponibilizar um data plane público separado do preview owner-only.
