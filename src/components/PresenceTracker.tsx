"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { getSubject } from "@/lib/subjects";
import { getPaperById } from "@/lib/papers";
import { reportLiveState } from "@/lib/liveSessions";

const ACTIVE_PROFILE_KEY = "icas-active-profile";
const HEARTBEAT_MS = 20000;

function resolveLocation(pathname: string): {
  profileSlug: string;
  profileName: string;
  section: string | null;
  pageLabel: string | null;
  isLiveExamPage: boolean;
} | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const directProfile = getProfile(segments[0]);

  if (directProfile) {
    if (directProfile.role === "admin") return null;

    if (segments.length === 1) {
      return {
        profileSlug: directProfile.slug,
        profileName: directProfile.name,
        section: null,
        pageLabel: "Choosing a subject",
        isLiveExamPage: false,
      };
    }

    if (segments[1] === "icas") {
      if (segments.length === 2) {
        return {
          profileSlug: directProfile.slug,
          profileName: directProfile.name,
          section: "ICAS",
          pageLabel: "Choosing a paper",
          isLiveExamPage: false,
        };
      }

      if (segments[2] === "exam" && segments[3]) {
        const paper = getPaperById(segments[3]);
        const isAttemptReview = segments[4] === "attempt";
        return {
          profileSlug: directProfile.slug,
          profileName: directProfile.name,
          section: "ICAS",
          pageLabel: isAttemptReview
            ? `Reviewing results — ${paper?.title ?? segments[3]}`
            : (paper?.title ?? segments[3]),
          isLiveExamPage: !isAttemptReview,
        };
      }
    }

    return {
      profileSlug: directProfile.slug,
      profileName: directProfile.name,
      section: null,
      pageLabel: "Browsing",
      isLiveExamPage: false,
    };
  }

  // Profile-less pages (e.g. the shared "/naplan" coming-soon page) — fall
  // back to whichever profile last resolved successfully in this browser.
  const subject = getSubject(segments[0]);
  if (subject) {
    const cachedSlug = window.localStorage.getItem(ACTIVE_PROFILE_KEY);
    const cachedProfile = cachedSlug ? getProfile(cachedSlug) : undefined;
    if (cachedProfile && cachedProfile.role !== "admin") {
      return {
        profileSlug: cachedProfile.slug,
        profileName: cachedProfile.name,
        section: subject.name,
        pageLabel: subject.available ? "Browsing" : "Coming soon",
        isLiveExamPage: false,
      };
    }
  }

  return null;
}

export function PresenceTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const location = resolveLocation(pathname);
    if (!location) return;

    window.localStorage.setItem(ACTIVE_PROFILE_KEY, location.profileSlug);

    const send = () => {
      if (document.visibilityState !== "visible") return;
      if (location.isLiveExamPage) {
        // The exam page owns question/answer/timer fields itself — only
        // report where they are, not what they're doing there.
        void reportLiveState({
          profileSlug: location.profileSlug,
          profileName: location.profileName,
          section: location.section,
          pageLabel: location.pageLabel,
        });
      } else {
        void reportLiveState({
          profileSlug: location.profileSlug,
          profileName: location.profileName,
          section: location.section,
          pageLabel: location.pageLabel,
          paperId: null,
          paperTitle: null,
          questionNumber: null,
          totalQuestions: null,
          answers: null,
          lastAnswerLabel: null,
          lastAnswerCorrect: null,
          examStatus: null,
          secondsLeft: null,
        });
      }
    };

    send();
    const interval = setInterval(send, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", send);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", send);
    };
  }, [pathname]);

  return null;
}
