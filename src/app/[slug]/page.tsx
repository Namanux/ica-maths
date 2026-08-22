import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profiles";
import { getSubject, SUBJECTS } from "@/lib/subjects";
import { SubjectGrid } from "@/components/SubjectGrid";
import { FlaggedQuestionsPanel } from "@/components/FlaggedQuestionsPanel";

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const profile = getProfile(slug);
  if (profile) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hi {profile.name}</h1>
          <p className="text-muted mt-1">Choose what you&apos;d like to practise.</p>
        </div>
        <SubjectGrid subjects={SUBJECTS} profileSlug={profile.slug} />
        {profile.role === "admin" && <FlaggedQuestionsPanel />}
      </div>
    );
  }

  const subject = getSubject(slug);
  if (subject && !subject.available) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{subject.name}</h1>
          <p className="text-muted mt-1">{subject.description}</p>
        </div>
        <div className="rounded-lg border border-border p-6 text-center text-muted">
          {subject.name} practice is coming soon.
        </div>
        <Link
          href="/"
          className="self-start rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
        >
          Back
        </Link>
      </div>
    );
  }

  notFound();
}
