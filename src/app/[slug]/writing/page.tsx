import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { WritingApp } from "@/components/writing/WritingApp";

export default async function WritingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  return <WritingApp slug={profile.slug} />;
}
