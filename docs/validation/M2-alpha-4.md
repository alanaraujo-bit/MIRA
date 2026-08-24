# M2 alpha 4 — preview público

Data: 24 de agosto de 2026

## Escopo

- Runtime nativo Next.js para publicação contínua no Vercel.
- PostgreSQL persistente no Railway com conexão TLS.
- Cadastro, login, logout e sessões HTTP-only pertencentes à Mira.
- Redirect público em `/go/:slug` com persistência de clique.
- Integração GitHub → Vercel pelo repositório `alanaraujo-bit/MIRA`.

## Evidência executada antes da publicação

- `npm run lint`: aprovado.
- `npm run build`: aprovado com TypeScript; 28 rotas geradas.
- Jornada contra o PostgreSQL Railway: cadastro, bootstrap, Campaign, Link, isolamento de Workspace, redirect 302, click persistido, analytics, QR, DNS, logout e login restaurado.
- Controles negativos: acesso cruzado ao Workspace retorna 403 e acesso cruzado ao Link retorna 404.

## Correções durante a validação

- O runtime anterior dependia de D1 e identidade do preview privado; ambos foram substituídos na superfície Vercel por adaptador PostgreSQL e autenticação própria.
- O projeto Vercel detectou inicialmente o framework como `Other`; a configuração foi corrigida explicitamente para `Next.js` antes do primeiro deploy.
- O PostgreSQL Railway expunha apenas rede privada; foi criado um proxy TCP público dedicado para a conexão segura do Vercel.
- Logout visível foi incluído nas superfícies autenticadas para que a jornada de teste não dependa de chamadas manuais à API.

## Gates ainda abertos

- Inspeção visual automatizada em desktop e mobile: o ambiente atual não expôs um navegador controlável.
- Confirmação de e-mail e recuperação de senha ainda não existem.
- Branded domains verificam ownership, mas provisionamento edge e SSL por domínio não está ativado.
- Performance, tolerância a falhas e carga do redirect público ainda precisam de validação dedicada.
