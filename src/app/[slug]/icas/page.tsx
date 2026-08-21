import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPapers } from "@/lib/papers";
import { getProfile } from "@/lib/profiles";
import { RecentAttempts } from "@/components/RecentAttempts";

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

      <div className="flex flex-col gap-3">
        {papers.map((paper) => (
          <Link
            key={paper.id}
            href={`/${slug}/exam/${paper.id}`}
            className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-surface transition-colors"
          >
            <div>
              <div className="font-medium">{paper.title}</div>
              <div className="text-sm text-muted mt-0.5">
                Year {paper.yearLevel} · {paper.questionCount} questions ·{" "}
                {paper.timeLimitMinutes} minutes
              </div>
            </div>
            <span aria-hidden className="text-muted">
              →
            </span>
          </Link>
        ))}
      </div>

      <RecentAttempts profileSlug={slug} />
    </div>
  );
}
