"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { getPaperById, paperExam, examHomeSlug } from "@/lib/papers";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountMenu } from "@/components/AccountMenu";

const SECTION_TITLES: Record<string, string> = {
  abacus: "Abacus",
  "selective-test": "Selective",
  edutest: "EduTest",
  naplan: "NAPLAN",
  icas: "ICAS Maths Simulator",
};

export function SiteHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const profile = segments.length > 0 ? getProfile(segments[0]) : undefined;
  const showTitle = segments.length > 1;

  // On an exam route the section comes from the paper; otherwise it's the
  // second path segment (falling back to ICAS).
  const examPaper = segments[1] === "exam" ? getPaperById(segments[2]) : undefined;
  const sectionSlug = examPaper
    ? paperExam(examPaper)
    : segments[1] === "abacus" ||
      segments[1] === "selective-test" ||
      segments[1] === "edutest" ||
      segments[1] === "naplan"
    ? segments[1]
    : "icas";
  const sectionTitle = SECTION_TITLES[sectionSlug] ?? SECTION_TITLES.icas;
  // Where the section title links to. On an exam route go to the paper's
  // section home (for Selective that is the component sub-page).
  const sectionHref = examPaper ? examHomeSlug(examPaper) : sectionSlug;

  return (
    <div className="flex items-center justify-between">
      {showTitle ? (
        <div className="flex items-center gap-3">
          {profile && (
            <Link
              href={`/${profile.slug}`}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Home
            </Link>
          )}
          <Link
            href={profile ? `/${profile.slug}/${sectionHref}` : "/"}
            className="font-semibold tracking-tight"
          >
            {sectionTitle}
          </Link>
        </div>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {profile && <AccountMenu profile={profile} />}
      </div>
    </div>
  );
}
