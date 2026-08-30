import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getAvailableSlotsForProduct } from "@/lib/bookings";
import { isProductSoldOut } from "@/lib/stock";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Checkout — Monetized",
};

async function getCheckoutProduct(username: string, slug: string) {
  return db.product.findFirst({
    where: { slug, status: "PUBLISHED", creatorProfile: { username } },
    include: { creatorProfile: true, variants: true },
  });
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; slug: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const { username, slug } = await params;
  const { variant: variantIdParam } = await searchParams;
  const product = await getCheckoutProduct(username, slug);
  if (!product) notFound();

  if (isProductSoldOut(product)) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-2 px-4 py-12 text-center">
        <p className="text-lg font-medium">This item is sold out.</p>
        <p className="text-sm text-muted-foreground">Check back later — it might restock.</p>
      </div>
    );
  }

  const selectedVariant =
    product.type === "PHYSICAL" && product.variants.length > 0
      ? product.variants.find((v) => v.id === variantIdParam)
      : undefined;
  if (product.type === "PHYSICAL" && product.variants.length > 0 && !selectedVariant) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-2 px-4 py-12 text-center">
        <p className="text-lg font-medium">Pick an option first.</p>
        <p className="text-sm text-muted-foreground">
          <Link href={`/${username}/${slug}`} className="underline">
            Go back to the product page
          </Link>{" "}
          and choose an option before checking out.
        </p>
      </div>
    );
  }

  const slots =
    product.type === "BOOKING" ? await getAvailableSlotsForProduct(product.id) : [];
  const shippingFeeMinor = product.type === "PHYSICAL" ? (product.shippingFeeMinor ?? 0) : 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-4 py-12">
      <div className="flex items-center gap-4 rounded-xl border p-4">
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
          <p className="truncate font-medium">
            {product.title}
            {selectedVariant && ` — ${selectedVariant.label}`}
          </p>
          <p className="text-sm text-muted-foreground">by {product.creatorProfile.displayName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-medium">
            {product.type === "TIP" && "From "}
            {formatMoney(product.priceAmountMinor, product.currency)}
            {product.type === "SUBSCRIPTION" && (
              <span className="text-xs font-normal text-muted-foreground">
                /{product.billingInterval === "MONTHLY" ? "mo" : "yr"}
              </span>
            )}
          </p>
          {shippingFeeMinor > 0 && (
            <p className="text-xs text-muted-foreground">
              + {formatMoney(shippingFeeMinor, product.currency)} shipping
            </p>
          )}
        </div>
      </div>

      <CheckoutForm
        username={username}
        slug={slug}
        isSubscription={product.type === "SUBSCRIPTION"}
        isBooking={product.type === "BOOKING"}
        isPhysical={product.type === "PHYSICAL"}
        isTip={product.type === "TIP"}
        slots={slots.map((slot) => slot.toISOString())}
        amountLabel={formatMoney(product.priceAmountMinor + shippingFeeMinor, product.currency)}
        suggestedTipAmount={product.type === "TIP" ? product.priceAmountMinor / 100 : undefined}
        currency={product.currency}
        variantId={selectedVariant?.id}
      />
    </div>
  );
}
