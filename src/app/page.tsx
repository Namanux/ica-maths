"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PROFILES, getProfile, type Profile } from "@/lib/profiles";

export const REMEMBER_KEY = "honeycomb-profile";

export default function ProfilePicker() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [remembered, setRemembered] = useState<Profile | null>(null);

  useEffect(() => {
    try {
      const slug = localStorage.getItem(REMEMBER_KEY);
      if (slug) setRemembered(getProfile(slug) ?? null);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const query = username.trim().toLowerCase();
    const profile = PROFILES.find(
      (p) => p.slug === query || p.name.toLowerCase() === query
    );
    if (!profile) {
      setError("We couldn't find that name. Check the spelling and try again.");
      return;
    }
    try {
      localStorage.setItem(REMEMBER_KEY, profile.slug);
    } catch {
      /* storage unavailable */
    }
    router.push(`/${profile.slug}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Who&apos;s practising?</h1>
        <p className="text-muted mt-1">Sign in with your name.</p>
      </div>

      {remembered && (
        <Link
          href={`/${remembered.slug}`}
          className="flex items-center justify-between rounded-lg border border-accent bg-accent/10 p-5 hover:bg-accent/20 transition-colors"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-lg font-semibold">
              {remembered.name.charAt(0).toUpperCase()}
            </span>
            <span className="font-medium">Continue as {remembered.name}</span>
          </span>
          <span aria-hidden className="text-muted">→</span>
        </Link>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-6">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError("");
            }}
            placeholder="Enter your name"
            autoComplete="username"
            className="rounded-md border border-border px-3 py-2 text-base font-normal bg-background"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Not required yet"
            autoComplete="current-password"
            className="rounded-md border border-border px-3 py-2 text-base font-normal bg-background"
          />
        </label>
        {error && <p className="text-sm text-incorrect">{error}</p>}
        <button
          type="submit"
          className="mt-2 rounded-full bg-accent text-background px-5 py-2.5 font-medium hover:opacity-90 transition-opacity"
        >
          {remembered ? "Switch profile" : "Log in"}
        </button>
      </form>
    </div>
  );
}
