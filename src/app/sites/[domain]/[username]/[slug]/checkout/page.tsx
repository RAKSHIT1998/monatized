import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveUsernameFromDomain } from "@/lib/storefront";
import CheckoutPage from "@/app/[username]/[slug]/checkout/page";

export const metadata: Metadata = {
  title: "Checkout — Monetized",
};

export default async function CustomDomainCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string; username: string; slug: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const { domain, username, slug } = await params;
  const resolved = await resolveUsernameFromDomain(domain);
  if (!resolved || resolved !== username) notFound();

  return <CheckoutPage params={Promise.resolve({ username, slug })} searchParams={searchParams} />;
}
