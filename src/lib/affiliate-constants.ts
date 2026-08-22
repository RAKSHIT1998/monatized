// Deliberately dependency-free (no "server-only", no db import) — proxy.ts
// runs on the Edge runtime and can't pull in anything Node-only.
export const REF_COOKIE_NAME = "monetized_ref";
export const REF_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
