import Link from "next/link";

export default function OfflinePage() {
  return <main className="offline-page">
    <div className="brand-mark offline-mark" aria-hidden="true"><i /><i /></div>
    <span className="eyebrow">Mira · offline</span>
    <h1>Seus links continuam no ar.</h1>
    <p>Este dispositivo está sem conexão, então dados e alterações do Workspace não podem ser carregados com segurança agora.</p>
    <Link className="button primary" href="/product">Tentar novamente</Link>
  </main>;
}
