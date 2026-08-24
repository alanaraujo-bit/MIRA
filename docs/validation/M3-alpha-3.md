# M3 alpha 3 — contexto de audiência minimizado

Data: 24 de agosto de 2026

## Escopo

- País e região aproximados a partir dos headers da infraestrutura Vercel.
- Idioma preferencial reduzido ao primeiro código válido.
- Sistema operacional e navegador classificados em famílias.
- Breakdowns de país, dispositivo e sistema no Analytics e no Link Inspector.
- Contexto compacto nos eventos recentes do Link.

## Privacidade por desenho

- IP não é persistido.
- User-agent bruto não é persistido.
- Cidade, latitude, longitude e CEP não são coletados.
- Geografia é comunicada como aproximação e pode ser alterada por VPN, proxy ou rede.
- Valores inválidos viram `unknown`/`Unknown`, sem preservar o conteúdo original.

## Evidência local

- Build de produção e TypeScript: aprovados, 37 rotas.
- ESLint: aprovado.
- Testes unitários: 14/14 aprovados.
- Auditoria de dependências de produção: zero vulnerabilidades conhecidas.
- Smoke contra PostgreSQL Railway: cadastro → Workspace → Campaign → Link → três redirects → Analytics → Link Inspector → QR → domínio → logout/login.
- Reconciliação: 3 cliques, 1 sessão, 66,7% de cobertura, país presente, idioma `pt-BR`, iOS e Safari.
- Controles negativos: relatório cross-Workspace 403, Link externo 404, período inválido 400 e GPC/DNT respeitados.

## Estado do gate

Validação remota no domínio final e inspeção visual controlada permanecem abertas até a publicação. O milestone M3 continua ativo porque volume representativo, retenção e materialização ainda não foram concluídos.
