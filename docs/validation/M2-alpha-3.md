# M2 alpha 3 — domínios de marca

Data: 2026-08-24

## Escopo executado

- Entidade `domains` isolada por Workspace, com propriedade, DNS, SSL, erro e timestamps independentes.
- Onboarding por hostname, sem solicitar acesso ao provedor DNS.
- Registro TXT exclusivo e consulta real por DNS-over-HTTPS com timeout.
- Estados de propagação, mismatch e indisponibilidade explicados na interface.
- Associação opcional entre Link e domínio; remoção segura volta o Link ao domínio padrão.
- Resolução de branded Link preparada no data plane, limitada a domínios `active`.

## Evidência funcional

- Build de produção, lint e 8/8 testes automatizados passaram.
- Smoke criou um domínio aleatório sob `example.com`, consultou o resolver real e recebeu `mismatch`, o resultado esperado para um TXT inexistente.
- Hostname contendo protocolo/caminho, duplicata e verificação por usuário externo retornaram 400, 400 e 404.
- Link persistiu `domain_id` e `domain_hostname`; após remover o domínio, ambos voltaram a `null` por `ON DELETE SET NULL`.
- Os smokes M1, M2 e M2-scale continuaram aprovados.
- Auditoria de dependências de produção retornou zero vulnerabilidades conhecidas.

## Gates

- Um caso positivo de ownership depende de publicar o TXT em um domínio controlado externamente.
- O ambiente Sites é owner-only; roteamento customizado e emissão SSL ainda não podem ser ativados com honestidade.
- Browser controlável permanece indisponível, então a inspeção visual desktop/mobile continua aberta.

## Publicação

- O commit funcional `93785c5` foi salvo como Sites versão 12 e publicado com sucesso no ambiente privado.
- O deployment `appgdep_6a8c89a95be08191b2e3b0c95029e33c` terminou em `succeeded`.
- O binding hospedado `DB` foi inspecionado após a publicação e expôs 11 tabelas, incluindo `domains`.
