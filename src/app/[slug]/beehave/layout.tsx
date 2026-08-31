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
  return (
    <BeehaveAuthProvider slug={slug}>
      {/* Full-bleed: break out of the app's max-w-4xl / py-6 main container so
          Beehave fills the whole viewport (tablet-friendly app view). */}
      <div className="flex flex-col w-screen ml-[calc(50%-50vw)] -my-6 min-h-[calc(100dvh-3.5rem)] overflow-x-hidden">
        {children}
      </div>
    </BeehaveAuthProvider>
  );
}
