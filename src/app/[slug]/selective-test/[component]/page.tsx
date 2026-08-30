import { notFound } from "next/navigation";
import Link from "next/link";
import { getPapersByExam } from "@/lib/papers";
import { getProfile } from "@/lib/profiles";
import { RecentAttempts } from "@/components/RecentAttempts";
import { PaperListLinks } from "@/components/PaperListLinks";
import { PerformancePanel } from "@/components/PerformancePanel";
import { ScrollRestoration } from "@/components/ScrollRestoration";

const COMPONENT_NAMES: Record<string, string> = {
  "mathematical-reasoning": "Mathematical Reasoning",
  reading: "Reading",
  "thinking-skills": "Thinking Skills",
  writing: "Writing",
};

export default async function SelectiveComponent({
  params,
}: {
  params: Promise<{ slug: string; component: string }>;
}) {
  const { slug, component } = await params;
  const profile = getProfile(slug);
  const name = COMPONENT_NAMES[component];
  if (!profile || !name) notFound();

  if (component === "mathematical-reasoning") {
    const papers = getPapersByExam("selective-test");
    return (
      <div className="flex flex-col gap-6">
        <ScrollRestoration storageKey={`selective-mr-scroll-${slug}`} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Mathematical Reasoning
          </h1>
          <p className="text-muted mt-1">
            NSW Selective High School Placement — Mathematical Reasoning practice
            papers, timed like the real test.
          </p>
        </div>

        <PaperListLinks papers={papers} slug={slug} />

        <PerformancePanel profileSlug={slug} exam="selective-test" />

        <RecentAttempts profileSlug={slug} exam="selective-test" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <p className="text-muted mt-1">
          NSW Selective High School Placement — {name}.
        </p>
      </div>
      <div className="rounded-lg border border-border p-6 text-center text-muted">
        {name} practice is coming soon.
      </div>
      <Link
        href={`/${slug}/selective-test`}
        className="self-start rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
      >
        Back
      </Link>
    </div>
  );
}
