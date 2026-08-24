"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignOutButton({ user }: { user: { displayName: string; email: string } }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      router.replace("/login");
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return <div className="product-user"><span>{user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>{user.email}</small></div><button type="button" onClick={signOut} disabled={busy} aria-label="Sair da Mira" title="Sair">{busy ? "…" : "Sair"}</button></div>;
}
