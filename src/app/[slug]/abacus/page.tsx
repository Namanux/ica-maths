import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { CURRICULUM } from "@/lib/abacus/curriculum";
import { getStudentProgress } from "@/lib/abacus/supabase";
import { getLevelTitle } from "@/lib/abacus/xp";
import { getContentBlockName } from "@/lib/abacus/progressionEngine";
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
  const contentBlock = progress?.contentBlock ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-muted">Your progress</span>
          <span className="font-medium">
            {totalXp} XP · {getLevelTitle(totalXp)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Currently practicing</span>
          <span>{getContentBlockName(contentBlock)}</span>
        </div>
      </div>

      <CurriculumLevels levels={CURRICULUM} profileSlug={slug} contentBlock={contentBlock} />
    </div>
  );
}
