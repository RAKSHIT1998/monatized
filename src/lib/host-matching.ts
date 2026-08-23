// Pure, dependency-free (no "server-only", no db) so it's both unit-testable
// and safe to import from the Edge proxy.
const OWN_HOST_SUFFIXES = ["localhost", "127.0.0.1", "vercel.app"];

/** Is this request host one of the platform's own, or a possible connected custom domain? */
export function isOwnHost(host: string, appUrl?: string) {
  const bareHost = host.split(":")[0];
  if (appUrl) {
    try {
      if (bareHost === new URL(appUrl).hostname) return true;
    } catch {
      // Malformed APP_URL — fall through to the suffix check below.
    }
  }
  return OWN_HOST_SUFFIXES.some((suffix) => bareHost === suffix || bareHost.endsWith(`.${suffix}`));
}
