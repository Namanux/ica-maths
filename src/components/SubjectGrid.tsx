import Link from "next/link";
import type { Subject } from "@/lib/subjects";

export function SubjectGrid({
  subjects,
  profileSlug,
}: {
  subjects: Subject[];
  profileSlug: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {subjects.map((subject) => (
        <Link
          key={subject.slug}
          href={subject.slug === "icas" ? `/${profileSlug}/icas` : `/${subject.slug}`}
          className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-surface transition-colors"
        >
          <div>
            <div className="font-medium">{subject.name}</div>
            <div className="text-sm text-muted mt-0.5">{subject.description}</div>
          </div>
          <span aria-hidden className="text-muted">
            {subject.available ? "→" : "Coming soon"}
          </span>
        </Link>
      ))}
    </div>
  );
}
