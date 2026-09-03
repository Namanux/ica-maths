import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profiles";

const YEAR_LEVELS = [
  {
    slug: "year5",
    name: "Year 5",
    description: "EduTest-style practice papers for Year 5 students.",
    available: true,
  },
];

export default async function EduTestHome({
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
        <h1 className="text-2xl font-semibold tracking-tight">EduTest</h1>
        <p className="text-muted mt-1">Choose a year level to practise.</p>
      </div>

      <div className="flex flex-col gap-3">
        {YEAR_LEVELS.map((yl) => (
          <Link
            key={yl.slug}
            href={`/${slug}/edutest/${yl.slug}`}
            className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-surface transition-colors"
          >
            <div>
              <div className="font-medium">{yl.name}</div>
              <div className="text-sm text-muted mt-0.5">{yl.description}</div>
            </div>
            <span aria-hidden className="text-muted">
              {yl.available ? "→" : "Coming soon"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
