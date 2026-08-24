import { requireChatGPTUser } from "../chatgpt-auth";
import ProductApp from "./product-app";

export const dynamic = "force-dynamic";

export default async function ProductPage() {
  const user = await requireChatGPTUser("/product");
  return <ProductApp user={{ displayName: user.displayName, email: user.email }} />;
}
