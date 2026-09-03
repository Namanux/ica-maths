import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profiles";

const EDUTEST_SUBJECTS = [
  {
    slug: "maths",
    name: "Mathematics",
    description: "Number, measurement, algebra, space and data.",
    available: true,
  },
  {
    slug: "numerical-reasoning",
    name: "Numerical Reasoning",
    description: "Number sequences, patterns and problem solving.",
    available: true,
  },
  {
    slug: "verbal-reasoning",
    name: "Verbal Reasoning",
    description: "Analogies, word meanings, codes and logical deduction.",
    available: true,
  },
  {
    slug: "reading-comprehension",
    name: "Reading Comprehension",
    description: "Passages with inference, vocabulary and main-idea questions.",
    available: true,
  },
];

export default async function EduTestYear5({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Year 5</h1>
        <p className="text-muted mt-1">Choose a subject to practise.</p>
      </div>

      <div className="flex flex-col gap-3">
        {EDUTEST_SUBJECTS.map((subject) => (
          <Link
            key={subject.slug}
            href={`/${slug}/edutest/year5/${subject.slug}`}
            className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-surface transition-colors"
          >
            <div>
              <div className="font-medium">{subject.name}</div>
              <div className="text-sm text-muted mt-0.5">{subject.description}</div>
            </div>
            <span aria-hidden className="text-muted">
              {subject.available ? "→" : "Coming soon"}
            </span>
          </Link>
        ))}
      </div>

      <Link
        href={`/${slug}/edutest`}
        className="self-start rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
      >
        Back
      </Link>
    </div>
  );
}
