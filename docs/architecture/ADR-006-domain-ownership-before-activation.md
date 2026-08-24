# ADR-006 — propriedade antes de ativação

Status: aceita em 2026-08-24.

## Decisão

Um domínio possui estados independentes de propriedade DNS, ativação de tráfego e SSL. A Mira confirma propriedade por um TXT exclusivo em `_mira-verification.<hostname>`, consultado por DNS-over-HTTPS. Um Link pode ser preparado com o domínio antes da ativação, mas o data plane só resolve hostnames cujo domínio esteja `active`.

## Razões

- Encontrar o TXT prova controle do DNS, mas não prova que a rota edge ou o certificado estão disponíveis.
- Fundir esses estados produziria um falso “pronto” e poderia distribuir Links quebrados.
- O token de ownership é específico por domínio e não exige credenciais do provedor DNS.
- A consulta usa endpoint fixo, timeout e parsing limitado a registros TXT; hostname do usuário nunca vira destino de `fetch`.

## Consequências

- A interface mostra instruções copiáveis, última consulta e erros acionáveis.
- A ativação pública permanece um gate explícito no ambiente owner-only.
- Remover um domínio ainda não ativo desacopla seus Links por chave estrangeira `SET NULL`.
- O hostname é reservado globalmente; antes de abertura comercial será necessário definir expiração e recuperação de verificações pendentes para evitar squatting.
