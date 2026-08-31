"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getProfile } from "@/lib/profiles";

/**
 * Beehave identity is Honeycomb identity.
 *
 * The profile slug comes from the `/[slug]/beehave` route. We look up the one
 * matching row in the merged Supabase `profiles` table (by its `slug` column)
 * to get the id / coin balance / avatar / Beehave role, and merge the display
 * name from Honeycomb's static profile list. There is no PIN, password, or
 * persisted session here — the URL slug is the session, exactly as it is for
 * every other section of the app.
 */

export type BeehaveRole = "kid" | "co-admin" | "admin";

export type BeehaveProfile = {
  id: string;
  slug: string;
  name: string;
  role: BeehaveRole;
  coin_balance: number;
  avatar_emoji: string | null;
  avatar_color: string | null;
  // Other columns on the row (pin, email, …) are carried through untouched so
  // ported dashboard code that reads them keeps working.
  [key: string]: unknown;
};

type BeehaveAuthValue = {
  profile: BeehaveProfile | null;
  profiles: BeehaveProfile[];
  loading: boolean;
  error: string | null;
  isParent: boolean;
  isKid: boolean;
  refreshCurrentProfile: () => Promise<void>;
  logout: () => void;
};

const BeehaveAuthContext = createContext<BeehaveAuthValue | null>(null);

function withDisplayName(row: Record<string, unknown>): BeehaveProfile {
  const slug = String(row.slug ?? "");
  const honeycomb = getProfile(slug);
  return {
    ...(row as BeehaveProfile),
    slug,
    name: honeycomb?.name ?? String(row.name ?? slug),
  };
}

export function BeehaveAuthProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<BeehaveProfile | null>(null);
  const [profiles, setProfiles] = useState<BeehaveProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    const honeycomb = getProfile(slug);

    if (!honeycomb) {
      setError("Unknown profile");
      setProfile(null);
      setProfiles([]);
      setLoading(false);
      return;
    }
    if (!supabase) {
      setError("Supabase is not configured");
      setProfile(null);
      setProfiles([]);
      setLoading(false);
      return;
    }

    const [{ data: mine, error: mineErr }, { data: all }] = await Promise.all([
      supabase.from("profiles").select("*").eq("slug", slug).single(),
      supabase.from("profiles").select("*").order("role"),
    ]);

    if (mineErr || !mine) {
      setError(mineErr?.message ?? "No Beehave profile row for this slug");
      setProfile(null);
      setProfiles((all ?? []).map(withDisplayName));
      setLoading(false);
      return;
    }

    setProfile(withDisplayName(mine));
    setProfiles((all ?? []).map(withDisplayName));
    setError(null);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const refreshCurrentProfile = useCallback(async () => {
    await load();
  }, [load]);

  const logout = useCallback(() => {
    router.push(`/${slug}`);
  }, [router, slug]);

  const value: BeehaveAuthValue = {
    profile,
    profiles,
    loading,
    error,
    isParent: profile?.role === "admin" || profile?.role === "co-admin",
    isKid: profile?.role === "kid",
    refreshCurrentProfile,
    logout,
  };

  return (
    <BeehaveAuthContext.Provider value={value}>
      {children}
    </BeehaveAuthContext.Provider>
  );
}

export function useBeehaveAuth(): BeehaveAuthValue {
  const ctx = useContext(BeehaveAuthContext);
  if (!ctx) {
    throw new Error("useBeehaveAuth must be used within a BeehaveAuthProvider");
  }
  return ctx;
}
