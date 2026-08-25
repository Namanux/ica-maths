import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profiles";
import { PracticeSession } from "@/components/abacus/PracticeSession";

export default async function AbacusLevelPage({
  params,
}: {
  params: Promise<{ slug: string; level: string }>;
}) {
  const { slug, level } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  const levelNumber = Number(level);

  if (levelNumber !== 1) {
    return (
      <div className="flex flex-col gap-6 max-w-xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coming soon</h1>
          <p className="text-muted mt-1">This level isn&apos;t available yet.</p>
        </div>
        <Link
          href={`/${slug}/abacus`}
          className="self-start rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
        >
          Back
        </Link>
      </div>
    );
  }

  return <PracticeSession level={1} lesson={1} profileSlug={slug} />;
}
