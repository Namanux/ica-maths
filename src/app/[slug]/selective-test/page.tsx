import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profiles";
import { getPapersByExam } from "@/lib/papers";
import { ScrollRestoration } from "@/components/ScrollRestoration";

const COMPONENTS = [
  {
    slug: "mathematical-reasoning",
    name: "Mathematical Reasoning",
    description: "35 questions, 40 minutes — multiple choice.",
    available: true,
  },
  {
    slug: "reading",
    name: "Reading",
    description: "Comprehension across a range of text types.",
    available: false,
  },
  {
    slug: "thinking-skills",
    name: "Thinking Skills",
    description: "Critical thinking and problem solving.",
    available: false,
  },
  {
    slug: "writing",
    name: "Writing",
    description: "One extended writing task.",
    available: false,
  },
];

export default async function SelectiveHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  const paperCount = getPapersByExam("selective-test").length;

  return (
    <div className="flex flex-col gap-6">
      <ScrollRestoration storageKey={`selective-scroll-${slug}`} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Selective High School Placement
        </h1>
        <p className="text-muted mt-1">
          Choose a test component to practise, timed like the real test.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {COMPONENTS.map((c) => {
          const count =
            c.slug === "mathematical-reasoning" ? paperCount : 0;
          return (
            <Link
              key={c.slug}
              href={`/${slug}/selective-test/${c.slug}`}
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-surface transition-colors"
            >
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-muted mt-0.5">
                  {c.description}
                  {count > 0 && ` · ${count} practice ${count === 1 ? "test" : "tests"}`}
                </div>
              </div>
              <span aria-hidden className="text-muted">
                {c.available ? "→" : "Coming soon"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
