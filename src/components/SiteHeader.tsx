"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { getPaperById, paperExam, examHomeSlug } from "@/lib/papers";
import { getSupabaseClient } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountMenu } from "@/components/AccountMenu";

const SECTION_TITLES: Record<string, string> = {
  abacus: "Abacus",
  "selective-test": "Selective",
  edutest: "EduTest",
  naplan: "NAPLAN",
  beehave: "Beehave",
  icas: "Honeycomb",
};

const BEEHAVE_TABS = ["Overview", "Approve", "Task", "Reward", "Message"] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
      segments[1] === "naplan" ||
      segments[1] === "beehave"
    ? segments[1]
    : "icas";
  const sectionTitle = SECTION_TITLES[sectionSlug] ?? SECTION_TITLES.icas;
  const sectionHref = examPaper ? examHomeSlug(examPaper) : sectionSlug;

  const inBeehave = sectionSlug === "beehave";
  const showBeehaveTabs = inBeehave && profile?.role === "admin";
  const activeTab = searchParams.get("tab") ?? "Overview";

  // Live coin score for the current profile — shown beside the Beehave link.
  const [coins, setCoins] = useState<number | null>(null);
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!profile || !supabase) {
      setCoins(null);
      return;
    }
    const slug = profile.slug;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("slug", slug)
        .single();
      if (!cancelled) {
        setCoins(
          (data as { coin_balance?: number } | null)?.coin_balance ?? null,
        );
      }
    };
    void load();
    const ch = supabase
      .channel(`beehave-coins-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `slug=eq.${slug}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void ch.unsubscribe();
    };
  }, [profile?.slug, profile]);

  // Pending-approval count for the Approve tab badge (admin, in Beehave only).
  const [pending, setPending] = useState(0);
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!showBeehaveTabs || !supabase) {
      setPending(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { count: c1 } = await supabase
        .from("task_completions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_approval");
      const { count: c2 } = await supabase
        .from("initiatives")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (!cancelled) setPending((c1 || 0) + (c2 || 0));
    };
    void load();
    const ch = supabase
      .channel("beehave-header-pending")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_completions" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "initiatives" },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void ch.unsubscribe();
    };
  }, [showBeehaveTabs]);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {showTitle && profile && (
          <Link
            href={`/${profile.slug}`}
            className="shrink-0 text-sm text-muted hover:text-foreground transition-colors"
          >
            Home
          </Link>
        )}

        {inBeehave && profile?.role === "admin" ? (
          <nav className="flex items-center gap-1 overflow-x-auto">
            {BEEHAVE_TABS.map((t) => {
              const active = activeTab === t;
              return (
                <Link
                  key={t}
                  href={`/${profile.slug}/beehave?tab=${t}`}
                  className={`relative whitespace-nowrap rounded-md px-2.5 py-1 text-sm transition-colors ${
                    active
                      ? "bg-surface font-semibold text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t}
                  {t === "Approve" && pending > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-incorrect px-1 text-[10px] font-bold text-background">
                      {pending}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        ) : showTitle ? (
          <Link
            href={profile ? `/${profile.slug}/${sectionHref}` : "/"}
            className="shrink-0 font-semibold tracking-tight"
          >
            {sectionTitle}
          </Link>
        ) : (
          <span />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {profile && !inBeehave && (
          <Link
            href={`/${profile.slug}/beehave`}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <span>Beehave</span>
            {coins !== null && (
              <span className="font-medium text-[#f5c518]">🪙 {coins}</span>
            )}
          </Link>
        )}
        {profile?.role === "admin" && (
          <Link
            href={`/${profile.slug}/live`}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-correct" aria-hidden />
            Live
          </Link>
        )}
        <ThemeToggle />
        {profile && <AccountMenu profile={profile} />}
      </div>
    </div>
  );
}
