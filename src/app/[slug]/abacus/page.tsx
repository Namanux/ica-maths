import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { CURRICULUM } from "@/lib/abacus/curriculum";
import { getStudentProgress } from "@/lib/abacus/supabase";
import { getLevelTitle } from "@/lib/abacus/xp";
import { CurriculumLevels } from "@/components/abacus/CurriculumLevels";

export default async function AbacusHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  const progress = await getStudentProgress(slug);
  const totalXp = progress?.totalXp ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Abacus practice</h1>
        <p className="text-muted mt-1">Mental arithmetic and abacus practice.</p>
      </div>

      <div className="rounded-lg border border-border p-4 flex items-center justify-between">
        <span className="text-muted">Your progress</span>
        <span className="font-medium">
          {totalXp} XP · {getLevelTitle(totalXp)}
        </span>
      </div>

      <CurriculumLevels levels={CURRICULUM} profileSlug={slug} />
    </div>
  );
}
