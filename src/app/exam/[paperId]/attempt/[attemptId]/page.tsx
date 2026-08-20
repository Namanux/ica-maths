import { notFound } from "next/navigation";
import { getPaperById } from "@/lib/papers";
import { AttemptViewer } from "@/components/AttemptViewer";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ paperId: string; attemptId: string }>;
}) {
  const { paperId, attemptId } = await params;
  const paper = getPaperById(paperId);

  if (!paper) {
    notFound();
  }

  return <AttemptViewer paper={paper} attemptId={attemptId} />;
}
