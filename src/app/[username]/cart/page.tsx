import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CartList } from "./cart-list";

export const metadata: Metadata = {
  title: "Your cart — Monetized",
};

export default async function CartPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const creatorProfile = await db.creatorProfile.findUnique({
    where: { username },
    select: { displayName: true, theme: { select: { primaryColor: true } } },
  });
  if (!creatorProfile) notFound();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        <p className="text-sm text-muted-foreground">{creatorProfile.displayName}</p>
      </div>
      <CartList username={username} accent={creatorProfile.theme?.primaryColor ?? "#111111"} />
    </div>
  );
}
