import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import AnalyticsApp from "./analytics-app";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Analytics — Mira", description: "Compare tráfego, fontes e performance dos seus Links." };

export default async function AnalyticsPage() {
  const user = await requireChatGPTUser("/product/analytics");
  return <AnalyticsApp user={{ displayName: user.displayName, email: user.email }} />;
}
