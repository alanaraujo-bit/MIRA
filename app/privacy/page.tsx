import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Práticas de dados — Mira",
  description: "Como a Mira trata dados de redirects, sessões, contas e Analytics durante o preview público.",
};

export default function PrivacyPage() {
  return <main className="privacy-page">
    <header><Link className="brand" href="/" aria-label="Mira, início"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Mira</span></Link><Link href="/">Voltar ao Roadmap</Link></header>
    <article>
      <div className="privacy-intro"><span className="eyebrow">Práticas de dados · preview público</span><h1>Medir sem fingir que sabemos mais do que sabemos.</h1><p>Esta página descreve o comportamento técnico atual da Mira. Ela evolui junto com o produto e não substitui os termos e políticas formais necessários antes do lançamento comercial.</p><time dateTime="2026-08-24">Atualizado em 24 de agosto de 2026</time></div>
      <section><span>01</span><div><h2>Quando alguém abre um Link</h2><p>A Mira registra o Link e Workspace responsáveis, horário, host de referência quando o navegador o fornece e uma classe reduzida de dispositivo. O produto não persiste o endereço IP nem o user-agent bruto em Analytics.</p></div></section>
      <section><span>02</span><div><h2>Sessões observadas</h2><p>O redirect pode criar o cookie first-party <code>mira_sid</code>, aleatório, HTTP-only e válido por 30 minutos. O token bruto não entra no banco: a Mira armazena somente um hash separado por Workspace. Isso impede correlação direta da mesma sessão entre clientes diferentes.</p><p>Global Privacy Control e Do Not Track removem o cookie e excluem aquele evento da métrica de sessão. O clique continua sendo contabilizado como operação básica do Link.</p></div></section>
      <section><span>03</span><div><h2>O que “sessão” não significa</h2><p>Uma sessão não identifica uma pessoa. Ela pode reiniciar por expiração, navegador, domínio, bloqueio de cookies ou preferência de privacidade. Por isso, a Mira informa a cobertura da métrica e não apresenta sessões como visitantes únicos.</p></div></section>
      <section><span>04</span><div><h2>Contas e Workspaces</h2><p>Contas públicas armazenam e-mail, nome, hash forte da senha e hashes de sessões autenticadas. Autorizações são verificadas no servidor para cada Workspace; dados de um cliente não devem aparecer para outro.</p></div></section>
      <section><span>05</span><div><h2>Limites deste preview</h2><p>Exportação, exclusão self-service, consentimento configurável por Workspace e políticas comerciais completas ainda não foram lançados. Esses itens permanecem gates explícitos do Roadmap antes da disponibilidade geral.</p></div></section>
    </article>
  </main>;
}
