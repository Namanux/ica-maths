import type { ReactNode } from "react";
import { BeehaveAuthProvider } from "@/lib/beehaveAuth";

export default async function BeehaveLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BeehaveAuthProvider slug={slug}>{children}</BeehaveAuthProvider>;
}
