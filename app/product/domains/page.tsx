import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import DomainsApp from "./domains-app";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Domínios — Mira", description: "Conecte, verifique e acompanhe domínios de marca." };

export default async function DomainsPage() {
  const user = await requireChatGPTUser("/product/domains");
  return <DomainsApp user={{ displayName: user.displayName, email: user.email }} />;
}
