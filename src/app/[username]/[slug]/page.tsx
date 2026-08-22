import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { recordStoreView } from "@/lib/storefront";
import { formatMoney } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function getPublishedProduct(username: string, slug: string) {
  return db.product.findFirst({
    where: { slug, status: "PUBLISHED", creatorProfile: { username } },
    include: {
      creatorProfile: { include: { theme: true } },
      modules: {
        orderBy: { position: "asc" },
        include: { lessons: { orderBy: { position: "asc" }, select: { id: true, title: true } } },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const product = await getPublishedProduct(username, slug);
  if (!product) return {};

  return {
    title: `${product.title} — ${product.creatorProfile.displayName}`,
    description: product.description ?? undefined,
    openGraph: {
      title: product.title,
      description: product.description ?? undefined,
      images: product.coverImageUrl ? [product.coverImageUrl] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const product = await getPublishedProduct(username, slug);
  if (!product) notFound();

  await recordStoreView(product.creatorProfileId, product.id);

  const accent = product.creatorProfile.theme?.primaryColor ?? "#111111";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-12">
      <Link
        href={`/${username}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {product.creatorProfile.displayName}
      </Link>

      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-muted">
        {product.coverImageUrl ? (
          <Image
            src={product.coverImageUrl}
            alt=""
            width={512}
            height={288}
            className="size-full object-cover"
          />
        ) : (
          <span className="text-4xl font-semibold text-muted-foreground">
            {product.title.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{product.title}</h1>
        <p className="mt-1 text-lg font-medium">
          {formatMoney(product.priceAmountMinor, product.currency)}
          {product.type === "SUBSCRIPTION" && (
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {product.billingInterval === "MONTHLY" ? "month" : "year"}
            </span>
          )}
        </p>
      </div>

      {product.description && (
        <p className="whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>
      )}

      {product.type === "COURSE" && product.modules.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          <p className="text-sm font-medium">What&apos;s included</p>
          {product.modules.map((courseModule) => (
            <div key={courseModule.id}>
              <p className="text-sm font-medium">{courseModule.title}</p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {courseModule.lessons.map((lesson) => (
                  <li key={lesson.id} className="text-sm text-muted-foreground">
                    {lesson.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Link
        href={`/${username}/${slug}/checkout`}
        className={cn(buttonVariants({ size: "lg" }), "w-full text-white")}
        style={{ backgroundColor: accent }}
      >
        {product.type === "SUBSCRIPTION" ? "Subscribe" : "Buy now"}
      </Link>
    </div>
  );
}
