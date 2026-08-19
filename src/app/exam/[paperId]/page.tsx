import { notFound } from "next/navigation";
import { getPaperById } from "@/lib/papers";
import { ExamRunner } from "@/components/ExamRunner";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;
  const paper = getPaperById(paperId);

  if (!paper) {
    notFound();
  }

  return <ExamRunner paper={paper} />;
}
