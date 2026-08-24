import { requireChatGPTUser } from "../chatgpt-auth";
import ProductApp from "./product-app";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mira — Visão geral",
  description: "Controle links, tráfego e resultados em seu Workspace Mira.",
};

export default async function ProductPage() {
  const user = await requireChatGPTUser("/product");
  return <ProductApp user={{ displayName: user.displayName, email: user.email }} />;
}
