"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function AuthForm({ mode, returnTo }: { mode: "login" | "register"; returnTo: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password"), returnTo }) });
      const payload = await response.json() as { error?: string; returnTo?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível continuar.");
      window.location.assign(payload.returnTo || "/product");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha inesperada."); setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-brand"><Link className="brand" href="/" aria-label="Mira, início"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Mira</span></Link><div><span className="eyebrow">Link Intelligence</span><h1>{mode === "login" ? "Volte ao controle." : "Seu primeiro link inteligente começa aqui."}</h1><p>{mode === "login" ? "Entre para criar, distribuir e compreender cada endereço da sua operação." : "Crie seu Workspace em segundos. Seus dados permanecem separados e cada clique nasce rastreável."}</p></div><footer><span>Preview público</span><p>Autenticação por senha protegida, sessão HTTP-only e limites contra abuso. Confirmação de e-mail entra antes do lançamento comercial.</p></footer></section><section className="auth-surface"><div className="auth-card"><header><span>{mode === "login" ? "Acesso ao Workspace" : "Nova conta"}</span><h2>{mode === "login" ? "Entrar na Mira" : "Criar conta"}</h2><p>{mode === "login" ? "Use o e-mail cadastrado neste ambiente." : "Sem cartão. Você chega ao primeiro Link imediatamente."}</p></header><form onSubmit={submit}>{mode === "register" && <label><span>Nome</span><input name="name" autoComplete="name" maxLength={80} required placeholder="Como devemos chamar você?" /></label>}<label><span>E-mail</span><input name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com" /></label><label><span>Senha</span><input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={10} maxLength={128} required placeholder={mode === "login" ? "Sua senha" : "10+ caracteres, letra e número"} /></label>{error && <div className="auth-error" role="alert"><span>!</span><p>{error}</p></div>}<button className="button primary" type="submit" disabled={busy}>{busy ? "Protegendo sua sessão…" : mode === "login" ? "Entrar" : "Criar conta e Workspace"}</button></form><div className="auth-switch">{mode === "login" ? <>Ainda não tem conta? <Link href={`/signup?returnTo=${encodeURIComponent(returnTo)}`}>Criar agora</Link></> : <>Já usa a Mira? <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Entrar</Link></>}</div></div></section></main>;
}
