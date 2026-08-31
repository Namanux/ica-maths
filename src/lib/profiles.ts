export type Profile = {
  slug: string;
  name: string;
  role: "admin" | "student";
};

export const PROFILES: Profile[] = [
  { slug: "naman", name: "Naman", role: "admin" },
  { slug: "aaron", name: "Aaron", role: "student" },
  { slug: "aarya", name: "Aarya", role: "student" },
];

export function getProfile(slug: string): Profile | undefined {
  return PROFILES.find((p) => p.slug === slug);
}
