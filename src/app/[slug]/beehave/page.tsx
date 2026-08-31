import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { KidDashboard } from "@/components/beehave/KidDashboard";
import { ParentDashboard } from "@/components/beehave/ParentDashboard";

export default async function BeehavePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  // Honeycomb role → Beehave dashboard: admin → parent view, everyone else → kid view.
  if (profile.role === "admin") return <ParentDashboard profileSlug={profile.slug} />;
  return <KidDashboard profileSlug={profile.slug} />;
}
