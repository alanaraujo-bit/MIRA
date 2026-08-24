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
- O hardening do toolchain removeu todos os 15 advisories altos; restam quatro moderados, todos herdados do loader interno do `drizzle-kit` e sem correção compatível não-breaking.

## Falhas e correções

- A execução inicial do servidor com PTY falhou por acesso negado ao `pwsh` do WindowsApps. O servidor foi iniciado com Windows PowerShell explícito e os dois smokes concluíram sem erro de aplicação.
- O upgrade de Vite expôs uma corrida no plugin de empacotamento: ambientes concorrentes removiam `dist/.openai` durante a cópia. A etapa foi serializada, os imports do config foram adaptados ao loader nativo e build + dois smokes passaram novamente.
- O navegador controlável permanece indisponível (`agent.browsers.list()` vazio); inspeção visual desktop/mobile continua aberta e impede marcar as tarefas de interface como concluídas.

## Gates ainda abertos

- Executar a jornada autenticada no ambiente hospedado.
- Inspecionar visualmente desktop e mobile.
- Disponibilizar um data plane público separado do preview owner-only.

## Publicação

- Commit funcional: `2c6dac2e2d6d73e87aa749addbe4fb753bff4a76`.
- Sites versão 7: deployment privado concluído com sucesso.
- D1 hospedado: binding `DB` verificado com `campaigns`, `tags`, `link_tags` e as cinco tabelas do M1.
- URL preservada: `https://mira-link-intelligence.alanvitoraraujo1a.chatgpt.site`.
