import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", base).toString();
  return {
    metadataBase: base,
    title: "Mira — Roadmap Live",
    description: "Acompanhamento verificável da construção da Mira Link Intelligence.",
    applicationName: "Mira Link Intelligence",
    manifest: "/manifest.webmanifest",
    icons: { icon: "/api/icon", shortcut: "/api/icon", apple: "/api/icon" },
    openGraph: { title: "Mira — Roadmap Live", description: "Infraestrutura programável para cada link.", images: [{ url: socialImage, width: 1731, height: 907 }] },
    twitter: { card: "summary_large_image", title: "Mira — Roadmap Live", description: "Infraestrutura programável para cada link.", images: [socialImage] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
