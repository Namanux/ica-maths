"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Profile } from "@/lib/profiles";

export function AccountMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const signOut = () => {
    setOpen(false);
    router.push("/");
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Account menu for ${profile.name}`}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface border border-border font-semibold text-sm hover:opacity-80 transition-opacity"
      >
        {profile.name.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-background shadow-lg overflow-hidden z-20">
          <div className="px-4 py-2.5 text-sm font-medium border-b border-border">
            {profile.name}
          </div>
          {profile.role === "admin" && (
            <Link
              href={`/${profile.slug}/live`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 w-full text-left px-4 py-2.5 text-sm hover:bg-surface transition-colors border-b border-border"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-correct" aria-hidden />
              Live activity
            </Link>
          )}
          <button
            onClick={signOut}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
