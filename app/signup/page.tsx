import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "../auth-form";
import { getChatGPTUser, safeRelativeReturnPath } from "../chatgpt-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Criar conta — Mira", description: "Crie seu Workspace de Link Intelligence." };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams;
  const returnTo = safeRelativeReturnPath(params.returnTo);
  if (await getChatGPTUser()) redirect(returnTo);
  return <AuthForm mode="register" returnTo={returnTo} />;
}
