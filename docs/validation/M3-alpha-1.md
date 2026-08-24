# M3 alpha 1 — Analytics de decisão

Data: 24 de agosto de 2026

## Escopo

- Relatório de Workspace para 7, 30 e 90 dias com período anterior equivalente.
- Série temporal, origens, dispositivos, automação conhecida, Links e Campaigns em destaque.
- Insights determinísticos que explicam crescimento, queda, origem dominante e concentração por dispositivo.
- Link Inspector com performance, configuração, UTMs, origem, dispositivo e eventos recentes.
- Navegação integrada entre biblioteca, Analytics, Link Inspector e Campaign Inspector.

## Evidência executada antes da publicação

- Build Next.js e TypeScript aprovados com as novas páginas e APIs.
- 10 testes de regras aprovados, incluindo comparação sem percentual enganoso quando a base anterior é zero.
- Smoke completo contra PostgreSQL Railway: 302 → evento → relatório → Link Inspector.
- Origem Instagram e dispositivo Mobile foram reconciliados entre evento, relatório e Inspector.
- Série do período somou exatamente o evento persistido; ranking de Link e Campaign apontou as entidades criadas.
- Período inválido retornou 400; relatório de outro Workspace retornou 403; Inspector externo retornou 404.
- Dependências de produção: zero vulnerabilidades conhecidas na auditoria executada.

## Evidência publicada

- Commit funcional `305a11b` publicado pelo `main` através da integração GitHub → Vercel.
- Deployment `dpl_6APCCZSkToYEdaJfsN3FrXyinSoz` recebeu estado `Ready` e atualizou `https://mira-link-intelligence.vercel.app`.
- Smoke remoto repetiu toda a jornada no domínio final e confirmou Analytics e Link Inspector contra o PostgreSQL Railway.
- GitHub Actions `32765722803`: lint, build, 10 testes e smoke persistente aprovados em 1m08s.

## Falhas encontradas e correções

- O primeiro smoke da sessão recebeu 400 no cadastro porque o limite anterior agrupava toda a rede em uma única chave. O limite foi separado por conta + rede, mantendo proteção contra abuso sem bloquear usuários distintos atrás do mesmo IP.
- Queries de ranking usavam alias no `HAVING`, aceito pelo runtime anterior e incompatível com PostgreSQL. As agregações foram tornadas explícitas e validadas contra o Railway.
- A troca de período disparava duas leituras por alterar a dependência do bootstrap. O carregamento inicial foi isolado da seleção 7/30/90.
- O teste unitário tentou importar o módulo acoplado ao banco. A regra de comparação foi extraída para um módulo puro e passou a ser testada sem infraestrutura.

## Gates ainda abertos

- O navegador controlável permaneceu indisponível; inspeção visual desktop/mobile continua aberta e o milestone não é marcado como concluído.
- Visitantes únicos, sessões, geografia, conversões e receita ainda não existem.
- Carga, reconciliação em volume, retenção e agregações materializadas serão validadas em etapas posteriores do M3.
