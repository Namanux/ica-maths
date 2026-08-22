"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountMenu } from "@/components/AccountMenu";

export function SiteHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const profile = segments.length > 0 ? getProfile(segments[0]) : undefined;
  const showTitle = segments.length > 1;

  return (
    <div className="flex items-center justify-between">
      {showTitle ? (
        <Link href={profile ? `/${profile.slug}/icas` : "/"} className="font-semibold tracking-tight">
          ICAS Maths Simulator
        </Link>
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
