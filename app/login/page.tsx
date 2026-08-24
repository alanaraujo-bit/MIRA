import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "../auth-form";
import { getChatGPTUser, safeRelativeReturnPath } from "../chatgpt-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar — Mira", description: "Acesse seu Workspace Mira." };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams;
  const returnTo = safeRelativeReturnPath(params.returnTo);
  if (await getChatGPTUser()) redirect(returnTo);
  return <AuthForm mode="login" returnTo={returnTo} />;
}
