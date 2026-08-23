import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveUsernameFromDomain } from "@/lib/storefront";
import ProductPage, {
  generateMetadata as generateProductMetadata,
} from "@/app/[username]/[slug]/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string; username: string; slug: string }>;
}): Promise<Metadata> {
  const { domain, username, slug } = await params;
  const resolved = await resolveUsernameFromDomain(domain);
  if (!resolved || resolved !== username) return {};
  return generateProductMetadata({ params: Promise.resolve({ username, slug }) });
}

export default async function CustomDomainProductPage({
  params,
}: {
  params: Promise<{ domain: string; username: string; slug: string }>;
}) {
  const { domain, username, slug } = await params;
  const resolved = await resolveUsernameFromDomain(domain);
  // The username segment always matches what StorefrontPage itself linked to
  // (see proxy.ts) — a mismatch means someone hand-typed a foreign username
  // under this domain, which should 404 rather than leak another creator's page.
  if (!resolved || resolved !== username) notFound();

  return <ProductPage params={Promise.resolve({ username, slug })} />;
}
