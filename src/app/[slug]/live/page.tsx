import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { LiveDashboard } from "@/components/LiveDashboard";

export default async function LivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile || profile.role !== "admin") notFound();

  return <LiveDashboard />;
}
