"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProfile } from "@/lib/profiles";

export function HeaderTitleLink() {
  const pathname = usePathname();
  const firstSegment = pathname.split("/")[1] ?? "";
  const profile = getProfile(firstSegment);
  const href = profile ? `/${profile.slug}/icas` : "/";

  return (
    <Link href={href} className="font-semibold tracking-tight">
      ICAS Maths Simulator
    </Link>
  );
}
