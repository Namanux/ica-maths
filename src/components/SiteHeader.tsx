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
  writing: "Writing practice",
  beehave: "Beehave",
  icas: "Honeycomb",
};

// The Beehave pill itself is the section home (tasks for kids, Overview for
// admins), so it isn't listed here.
// Same relative order for every user; each role shows its own subset.
const ADMIN_BEEHAVE_TABS = ["Passbook", "Task", "Reward", "Message"];
const KID_BEEHAVE_TABS = ["Passbook", "Reward"];

function pill(active: boolean) {
  return `whitespace-nowrap rounded-md px-2 py-1 text-[13px] transition-colors ${
    active
      ? "bg-surface font-semibold text-foreground"
      : "text-muted hover:text-foreground"
  }`;
}

export function SiteHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const segments = pathname.split("/").filter(Boolean);
  const profile = segments.length > 0 ? getProfile(segments[0]) : undefined;

  const isHome = segments.length === 1;
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
      segments[1] === "writing" ||
      segments[1] === "beehave"
    ? segments[1]
    : "icas";
  const sectionTitle = SECTION_TITLES[sectionSlug] ?? SECTION_TITLES.icas;
  const sectionHref = examPaper ? examHomeSlug(examPaper) : sectionSlug;

  // Remember the last profile used so "/" can offer "Continue as …".
  useEffect(() => {
    if (!profile) return;
    try {
      localStorage.setItem("honeycomb-profile", profile.slug);
    } catch {
      /* storage unavailable */
    }
  }, [profile?.slug, profile]);

  const inBeehave = sectionSlug === "beehave";
  const inOtherSection = showTitle && !inBeehave;
  const isAdmin = profile?.role === "admin";
  const showBeehaveTabs = inBeehave && isAdmin; // gates the Approve-badge fetch
  const activeTab = searchParams.get("tab") ?? "Overview";
  const beehaveSubTabs = isAdmin ? ADMIN_BEEHAVE_TABS : KID_BEEHAVE_TABS;
  // The Beehave pill = the section home; highlighted unless a sub-tab is active.
  const beehavePillActive =
    inBeehave && !beehaveSubTabs.includes(activeTab);

  // Live coin score for the current profile — shown on the Beehave nav item.
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

  // Pin the coin score into the header the moment the big in-page one slips
  // under the sticky nav bar's bottom edge (not when it's fully off-screen).
  const [coinPinned, setCoinPinned] = useState(false);
  useEffect(() => {
    let io: IntersectionObserver | null = null;
    let timer: number | undefined;
    let tries = 0;
    const attach = () => {
      const el = document.getElementById("beehave-coin-big");
      if (el) {
        const headerH = Math.ceil(
          document.querySelector("header")?.getBoundingClientRect().height ?? 0,
        );
        io = new IntersectionObserver(
          ([e]) => setCoinPinned(e.intersectionRatio < 1),
          { threshold: [0, 1], rootMargin: `-${headerH}px 0px 0px 0px` },
        );
        io.observe(el);
      } else if (tries++ < 20) {
        timer = window.setTimeout(attach, 100);
      } else {
        setCoinPinned(false);
      }
    };
    timer = window.setTimeout(attach, 0);
    return () => {
      if (timer) clearTimeout(timer);
      io?.disconnect();
      setCoinPinned(false);
    };
  }, [pathname, activeTab]);

  // Tell the in-page views to hide their big coin while the header copy shows.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("beehave:coinpinned", { detail: coinPinned }),
    );
  }, [coinPinned]);

  return (
    <div className="flex items-center justify-between gap-2">
      <nav className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">
        {profile && (
          <>
            <Link href={`/${profile.slug}`} className={pill(isHome)}>
              Home
            </Link>
            <Link
              href={`/${profile.slug}/beehave`}
              className={pill(beehavePillActive)}
            >
              Beehave
            </Link>

            {inBeehave &&
              beehaveSubTabs.map((t) => {
                const active = activeTab === t;
                return (
                  <Link
                    key={t}
                    href={`/${profile.slug}/beehave?tab=${t}`}
                    className={`relative ${pill(active)}`}
                  >
                    {t}
                    {t === "Passbook" &&
                      profile.role === "admin" &&
                      pending > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-incorrect px-1 text-[10px] font-bold text-background">
                        {pending}
                      </span>
                    )}
                  </Link>
                );
              })}

            {inOtherSection && (
              <Link
                href={`/${profile.slug}/${sectionHref}`}
                className={pill(true)}
              >
                {sectionTitle}
              </Link>
            )}
          </>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        {coinPinned && coins !== null && (
          <span className="flex items-center gap-1 text-[13px] font-bold text-[#f5c518]">
            🪙 {coins}
          </span>
        )}
        {isAdmin && profile && (
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
