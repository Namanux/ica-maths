import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profiles";
import { isLevelUnlocked } from "@/lib/abacus/curriculum";
import { getStudentProgress } from "@/lib/abacus/supabase";
import { PracticeSession } from "@/components/abacus/PracticeSession";

function ComingSoon({ slug, heading, body }: { slug: string; heading: string; body: string }) {
  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        <p className="text-muted mt-1">{body}</p>
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

export default async function AbacusLevelPage({
  params,
}: {
  params: Promise<{ slug: string; level: string }>;
}) {
  const { slug, level } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  const levelNumber = Number(level);

  if (levelNumber !== 1 && levelNumber !== 2) {
    return (
      <ComingSoon slug={slug} heading="Coming soon" body="This level isn't available yet." />
    );
  }

  if (levelNumber === 2) {
    const progress = await getStudentProgress(slug);
    const unlocked = isLevelUnlocked(2, progress?.highestLessonUnlocked ?? 1);
    if (!unlocked) {
      return (
        <ComingSoon
          slug={slug}
          heading="Locked"
          body="Complete Level 1 first to unlock Level 2."
        />
      );
    }
    return <PracticeSession level={2} lesson={1} profileSlug={slug} />;
  }

  return <PracticeSession level={1} lesson={1} profileSlug={slug} />;
}
