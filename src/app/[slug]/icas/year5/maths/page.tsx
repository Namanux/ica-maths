import { notFound } from "next/navigation";
import Link from "next/link";
import { getPapersByExam } from "@/lib/papers";
import { getProfile } from "@/lib/profiles";
import { RecentAttempts } from "@/components/RecentAttempts";
import { PaperListLinks } from "@/components/PaperListLinks";
import { PerformancePanel } from "@/components/PerformancePanel";
import { ScrollRestoration } from "@/components/ScrollRestoration";

export default async function IcasYear5Maths({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  const papers = getPapersByExam("icas");

  return (
    <div className="flex flex-col gap-6">
      <ScrollRestoration storageKey={`icas-maths-scroll-${slug}`} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Choose a paper</h1>
        <p className="text-muted mt-1">
          Full-length ICAS-style Mathematics practice papers, timed like the real exam.
        </p>
      </div>

      <PaperListLinks papers={papers} slug={slug} />

      <PerformancePanel profileSlug={slug} exam="icas" />

      <RecentAttempts profileSlug={slug} exam="icas" />

      <Link
        href={`/${slug}/icas/year5`}
        className="self-start rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
      >
        Back
      </Link>
    </div>
  );
}
