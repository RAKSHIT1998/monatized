import "server-only";
import { db } from "@/lib/db";

const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "dashboard",
  "login",
  "signup",
  "onboarding",
  "settings",
  "billing",
  "order",
  "orders",
  "checkout",
  "download",
  "help",
  "pricing",
  "features",
  "templates",
  "creators",
  "blog",
  "www",
  "app",
  "static",
  "monetized",
]);

export function slugifyUsername(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
}

export async function generateUniqueUsername(seed: string) {
  const base = slugifyUsername(seed) || "creator";

  for (const candidate of [base, ...Array.from({ length: 20 })]) {
    const username =
      typeof candidate === "string"
        ? candidate
        : `${base}${Math.floor(1000 + Math.random() * 9000)}`;

    if (RESERVED_USERNAMES.has(username)) continue;

    const existing = await db.creatorProfile.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!existing) return username;
  }

  // Extremely unlikely fallback after 20 collisions.
  return `${base}${Date.now()}`;
}

export function isReservedUsername(username: string) {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}
