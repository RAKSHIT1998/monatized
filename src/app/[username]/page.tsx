import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicStoreByUsername, getRecentSalesCount, recordStoreView } from "@/lib/storefront";
import { formatMoney } from "@/lib/money";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Flame } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const store = await getPublicStoreByUsername(username);
  if (!store) return {};

  return {
    title: `${store.displayName} — Monetized`,
    description: store.bio ?? `Shop ${store.displayName}'s products on Monetized.`,
    openGraph: {
      title: store.displayName,
      description: store.bio ?? undefined,
      images: store.avatarUrl ? [store.avatarUrl] : undefined,
    },
  };
}

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  twitter: "X / Twitter",
  website: "Website",
};

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const store = await getPublicStoreByUsername(username);
  if (!store) notFound();

  const [, recentSalesCount] = await Promise.all([
    recordStoreView(store.id),
    getRecentSalesCount(store.id),
  ]);

  const accent = store.theme?.primaryColor ?? "#111111";
  const socialLinks = (store.socialLinks ?? {}) as Record<string, string>;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 px-4 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <Avatar size="lg" className="size-20">
          {store.avatarUrl && <AvatarImage src={store.avatarUrl} alt={store.displayName} />}
          <AvatarFallback className="text-2xl">
            {store.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{store.displayName}</h1>
          {store.bio && <p className="mt-1 text-sm text-muted-foreground">{store.bio}</p>}
        </div>
        {Object.keys(socialLinks).length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(socialLinks).map(([key, url]) =>
              url ? (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {SOCIAL_LABELS[key] ?? key}
                  <ExternalLink className="size-3" />
                </a>
              ) : null,
            )}
          </div>
        )}
        {recentSalesCount !== null && (
          <div className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <Flame className="size-3.5" style={{ color: accent }} />
            {recentSalesCount} sale{recentSalesCount === 1 ? "" : "s"} in the last 7 days
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {store.products.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No products yet — check back soon.
          </p>
        ) : (
          store.products.map((product) => (
            <Link
              key={product.id}
              href={`/${store.username}/${product.slug}`}
              className="flex items-center gap-4 rounded-xl border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {product.coverImageUrl ? (
                  <Image
                    src={product.coverImageUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-muted-foreground">
                    {product.title.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{product.title}</p>
                <p className="text-sm text-muted-foreground">
                  {product.type === "TIP" && "From "}
                  {formatMoney(product.priceAmountMinor, product.currency)}
                  {product.type === "PHYSICAL" && product.stockQuantity === 0 && (
                    <span className="ml-1.5 text-destructive">Sold out</span>
                  )}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: accent }}
              >
                View
              </span>
            </Link>
          ))
        )}
      </div>

      {!store.plan.removesBranding && (
        <Link
          href="/"
          className="mx-auto text-xs text-muted-foreground hover:text-foreground"
        >
          Powered by Monetized
        </Link>
      )}
    </div>
  );
}
