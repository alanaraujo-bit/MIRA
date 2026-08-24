import type { Metadata } from "next";
import { requireChatGPTUser } from "../../../chatgpt-auth";
import CampaignInspector from "./campaign-inspector";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campaign Inspector — Mira", description: "Compare canais e Links de uma Campaign." };

async function ProtectedInspector({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireChatGPTUser(`/product/campaigns/${encodeURIComponent(id)}`);
  return <CampaignInspector campaignId={id} user={{ displayName: user.displayName, email: user.email }} />;
}

export default function CampaignInspectorPage({ params }: { params: Promise<{ id: string }> }) {
  return <ProtectedInspector params={params} />;
}
