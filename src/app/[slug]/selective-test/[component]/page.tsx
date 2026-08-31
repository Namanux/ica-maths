import { notFound } from "next/navigation";
import Link from "next/link";
import { getSelectivePapers } from "@/lib/papers";
import { getProfile } from "@/lib/profiles";
import { PaperListLinks } from "@/components/PaperListLinks";
import { PerformancePanel } from "@/components/PerformancePanel";
import { ScrollRestoration } from "@/components/ScrollRestoration";

const COMPONENTS: Record<
  string,
  { name: string; blurb: string; hasPapers: boolean }
> = {
  "mathematical-reasoning": {
    name: "Mathematical Reasoning",
    blurb:
      "NSW Selective High School Placement — Mathematical Reasoning practice papers, timed like the real test.",
    hasPapers: true,
  },
  reading: {
    name: "Reading",
    blurb:
      "NSW Selective High School Placement — Reading practice papers: comprehension across extracts, poetry, cloze and text-structure tasks.",
    hasPapers: true,
  },
  "thinking-skills": {
    name: "Thinking Skills",
    blurb:
      "NSW Selective High School Placement — Thinking Skills practice papers: critical thinking and problem solving, timed like the real test.",
    hasPapers: true,
  },
  writing: {
    name: "Writing",
    blurb: "NSW Selective High School Placement — Writing.",
    hasPapers: false,
  },
};

export default async function SelectiveComponent({
  params,
}: {
  params: Promise<{ slug: string; component: string }>;
}) {
  const { slug, component } = await params;
  const profile = getProfile(slug);
  const meta = COMPONENTS[component];
  if (!profile || !meta) notFound();

  const papers = meta.hasPapers ? getSelectivePapers(component) : [];

  if (meta.hasPapers && papers.length > 0) {
    return (
      <div className="flex flex-col gap-6">
        <ScrollRestoration storageKey={`selective-${component}-scroll-${slug}`} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.name}</h1>
          <p className="text-muted mt-1">{meta.blurb}</p>
        </div>

        <PaperListLinks papers={papers} slug={slug} />

        <PerformancePanel profileSlug={slug} exam="selective-test" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{meta.name}</h1>
        <p className="text-muted mt-1">{meta.blurb}</p>
      </div>
      <div className="rounded-lg border border-border p-6 text-center text-muted">
        {meta.name} practice is coming soon.
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
