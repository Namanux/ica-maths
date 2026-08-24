import { notFound } from "next/navigation";
import { getAllPapers } from "@/lib/papers";
import { getProfile } from "@/lib/profiles";
import { RecentAttempts } from "@/components/RecentAttempts";
import { PaperListLinks } from "@/components/PaperListLinks";
import { PerformancePanel } from "@/components/PerformancePanel";

export default async function IcasHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  const papers = getAllPapers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Choose a paper</h1>
        <p className="text-muted mt-1">
          Full-length ICAS-style Mathematics practice papers, timed like the real exam.
        </p>
      </div>

      <PaperListLinks papers={papers} slug={slug} />

      <PerformancePanel profileSlug={slug} />

      <RecentAttempts profileSlug={slug} />
    </div>
  );
}
