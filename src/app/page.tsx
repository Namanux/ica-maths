import Link from "next/link";
import { PROFILES } from "@/lib/profiles";

export default function ProfilePicker() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Who&apos;s practising?</h1>
        <p className="text-muted mt-1">Pick a profile to continue.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PROFILES.map((profile) => (
          <Link
            key={profile.slug}
            href={`/${profile.slug}`}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-6 hover:bg-surface transition-colors"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-lg font-semibold">
              {profile.name.charAt(0)}
            </span>
            <span className="font-medium">{profile.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
