import { notFound } from "next/navigation";
import { getPaperById } from "@/lib/papers";
import { getProfile } from "@/lib/profiles";
import { AttemptViewer } from "@/components/AttemptViewer";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ slug: string; paperId: string; attemptId: string }>;
}) {
  const { slug, paperId, attemptId } = await params;
  const profile = getProfile(slug);
  const paper = getPaperById(paperId);

  if (!profile || !paper) {
    notFound();
  }

  return <AttemptViewer paper={paper} attemptId={attemptId} profileSlug={slug} />;
}
