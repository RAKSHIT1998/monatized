import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookingActions } from "./booking-actions";

export const metadata: Metadata = {
  title: "Your booking — Monetized",
};

export default async function BookingPage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;

  const booking = await db.booking.findUnique({
    where: { accessToken },
    include: { product: { include: { creatorProfile: { select: { displayName: true } } } } },
  });

  if (!booking) notFound();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div>
        <p className="text-sm text-muted-foreground">{booking.product.creatorProfile.displayName}</p>
        <h1 className="text-xl font-semibold tracking-tight">{booking.product.title}</h1>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={booking.status === "CONFIRMED" ? "default" : "secondary"}>
              {booking.status === "CONFIRMED" ? "Confirmed" : "Cancelled"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">When</span>
            <span className="text-sm font-medium">
              {booking.startsAt.toLocaleString("en-IN", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>

          {booking.product.description && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {booking.product.description}
            </p>
          )}

          {booking.status === "CONFIRMED" && <BookingActions accessToken={accessToken} />}
        </CardContent>
      </Card>
    </div>
  );
}
