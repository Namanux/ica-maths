import { notFound } from "next/navigation";
import { getPaperById } from "@/lib/papers";
import { getProfile } from "@/lib/profiles";
import { ExamRunner } from "@/components/ExamRunner";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ slug: string; paperId: string }>;
}) {
  const { slug, paperId } = await params;
  const profile = getProfile(slug);
  const paper = getPaperById(paperId);

  if (!profile || !paper) {
    notFound();
  }

  return <ExamRunner paper={paper} profileSlug={slug} />;
}
