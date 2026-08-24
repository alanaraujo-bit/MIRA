import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import CampaignsApp from "./campaigns-app";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campaigns — Mira", description: "Organize canais e compare tráfego por campanha." };

export default async function CampaignsPage() {
  const user = await requireChatGPTUser("/product/campaigns");
  return <CampaignsApp user={{ displayName: user.displayName, email: user.email }} />;
}
