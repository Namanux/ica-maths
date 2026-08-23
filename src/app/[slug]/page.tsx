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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Hi {profile.name}</h1>
            <p className="text-muted mt-1">Choose what you&apos;d like to practise.</p>
          </div>
          {profile.role === "admin" && (
            <Link
              href={`/${profile.slug}/live`}
              className="flex items-center gap-2 shrink-0 rounded-full border border-accent text-accent px-4 py-2 text-sm font-medium hover:bg-accent/10 transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-correct" aria-hidden />
              Live activity
            </Link>
          )}
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
