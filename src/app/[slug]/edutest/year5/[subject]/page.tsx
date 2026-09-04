import { notFound } from "next/navigation";
import Link from "next/link";
import { getEdutestPapers } from "@/lib/papers";
import { getProfile } from "@/lib/profiles";
import { PaperListLinks } from "@/components/PaperListLinks";
import { PerformancePanel } from "@/components/PerformancePanel";
import { ScrollRestoration } from "@/components/ScrollRestoration";

export default async function EduTestYear5Subject({
  params,
}: {
  params: Promise<{ slug: string; subject: string }>;
}) {
  const { slug, subject } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  const papers = getEdutestPapers(5, subject);
  if (papers.length === 0) notFound();

  const subjectName = papers[0].subject;

  return (
    <div className="flex flex-col gap-6">
      <ScrollRestoration storageKey={`edutest-${subject}-scroll-${slug}`} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{subjectName}</h1>
        <p className="text-muted mt-1">
          EduTest-style Year 5 {subjectName} practice, timed like the real test.
        </p>
      </div>

      <PaperListLinks papers={papers} slug={slug} />

      <PerformancePanel
        profileSlug={slug}
        exam="edutest"
        subject={subjectName}
        yearLevel={5}
      />

      <Link
        href={`/${slug}/edutest/year5`}
        className="self-start rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
      >
        Back
      </Link>
    </div>
  );
}
