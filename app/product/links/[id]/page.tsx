import type { Metadata } from "next";
import { requireChatGPTUser } from "../../../chatgpt-auth";
import LinkInspector from "./link-inspector";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Link Inspector — Mira", description: "Performance e configuração de um Link em um só lugar." };

export default async function LinkInspectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireChatGPTUser(`/product/links/${encodeURIComponent(id)}`);
  return <LinkInspector linkId={id} user={{ displayName: user.displayName, email: user.email }} />;
}
