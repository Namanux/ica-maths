import { notFound } from "next/navigation";
import { getPapersByExam } from "@/lib/papers";
import { getProfile } from "@/lib/profiles";
import { PaperListLinks } from "@/components/PaperListLinks";
import { PerformancePanel } from "@/components/PerformancePanel";
import { ScrollRestoration } from "@/components/ScrollRestoration";

export default async function NaplanHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  const papers = getPapersByExam("naplan");

  return (
    <div className="flex flex-col gap-6">
      <ScrollRestoration storageKey={`naplan-scroll-${slug}`} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Choose a paper</h1>
        <p className="text-muted mt-1">
          NAPLAN-style Numeracy practice papers, timed like the real test.
        </p>
      </div>

      <PaperListLinks papers={papers} slug={slug} />

      <PerformancePanel profileSlug={slug} exam="naplan" />
    </div>
  );
}
