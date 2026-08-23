import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveUsernameFromDomain } from "@/lib/storefront";
import StorefrontPage, { generateMetadata as generateStorefrontMetadata } from "@/app/[username]/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const username = await resolveUsernameFromDomain(domain);
  if (!username) return {};
  return generateStorefrontMetadata({ params: Promise.resolve({ username }) });
}

// Reached only via the host-based rewrite in proxy.ts — a visitor's own custom
// domain resolves here, then renders the exact same storefront page a
// monetized.com/{username} visit would.
export default async function CustomDomainStorefrontPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const username = await resolveUsernameFromDomain(domain);
  if (!username) notFound();

  return <StorefrontPage params={Promise.resolve({ username })} />;
}
