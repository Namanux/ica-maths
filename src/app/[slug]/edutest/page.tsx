import { notFound } from "next/navigation";
import { getPapersByExam } from "@/lib/papers";
import { getProfile } from "@/lib/profiles";
import { RecentAttempts } from "@/components/RecentAttempts";
import { PaperListLinks } from "@/components/PaperListLinks";
import { PerformancePanel } from "@/components/PerformancePanel";
import { ScrollRestoration } from "@/components/ScrollRestoration";

export default async function EduTestHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  const papers = getPapersByExam("edutest");

  return (
    <div className="flex flex-col gap-6">
      <ScrollRestoration storageKey={`edutest-scroll-${slug}`} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Choose a paper</h1>
        <p className="text-muted mt-1">
          EduTest-style Mathematics and Numerical Reasoning practice papers, timed
          like the real scholarship test.
        </p>
      </div>

      <PaperListLinks papers={papers} slug={slug} />

      <PerformancePanel profileSlug={slug} exam="edutest" />

      <RecentAttempts profileSlug={slug} exam="edutest" />
    </div>
  );
}
